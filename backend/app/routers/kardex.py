"""Physical stock ledger. Historic monetary values are not stored in movements."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, case
from app.security import DB, Actor, require
from app.models import Ingredient, InventoryMovement, User

router = APIRouter(prefix="/api/v1/inventory", tags=["Inventario"])
LIMA = ZoneInfo("America/Lima")


@router.get("/kardex")
def kardex(
    db: DB,
    actor: Actor,
    ingredient_id: int = Query(gt=0),
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(50, ge=1, le=20000),
    offset: int = Query(0, ge=0),
):
    require(actor, db, "admin", "manager", "sales", "production")
    if from_date and to_date and from_date > to_date:
        raise HTTPException(422, "La fecha inicial no puede superar la fecha final")
    if to_date == date.max:
        raise HTTPException(422, "Fecha final fuera de rango")
    ingredient = db.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(404, "Ingrediente no encontrado")
    movement = InventoryMovement
    conditions = [movement.ingredient_id == ingredient_id]
    if from_date:
        conditions.append(
            movement.created_at
            >= datetime.combine(from_date, time.min, LIMA).astimezone(timezone.utc)
        )
    end = (
        datetime.combine(to_date + timedelta(days=1), time.min, LIMA).astimezone(
            timezone.utc
        )
        if to_date
        else None
    )
    if end:
        conditions.append(movement.created_at < end)
    ascending = (movement.created_at.asc(), movement.id.asc())
    descending = (movement.created_at.desc(), movement.id.desc())
    base = select(movement).where(*conditions)
    first = db.scalar(base.order_by(*ascending).limit(1))
    last = db.scalar(base.order_by(*descending).limit(1))
    oldest = db.scalar(
        select(movement)
        .where(movement.ingredient_id == ingredient_id)
        .order_by(*ascending)
        .limit(1)
    )
    if first:
        opening = first.balance_after - first.quantity
        closing = last.balance_after
    else:
        prior = select(movement).where(movement.ingredient_id == ingredient_id)
        if end:
            prior = prior.where(movement.created_at < end)
        previous = db.scalar(prior.order_by(*descending).limit(1))
        opening = (
            previous.balance_after
            if previous
            else oldest.balance_after - oldest.quantity if oldest else ingredient.stock
        )
        closing = opening
    total, incoming, outgoing = db.execute(
        select(
            func.count(movement.id),
            func.coalesce(
                func.sum(case((movement.quantity > 0, movement.quantity), else_=0)), 0
            ),
            func.coalesce(
                func.sum(case((movement.quantity < 0, -movement.quantity), else_=0)), 0
            ),
        ).where(*conditions)
    ).one()
    records = db.execute(
        select(movement, User.name)
        .join(User, User.id == movement.created_by)
        .where(*conditions)
        .order_by(*ascending)
        .limit(limit)
        .offset(offset)
    ).all()

    def value(number):
        return format(Decimal(number), ".3f")

    return {
        "ingredient": {
            "id": ingredient.id,
            "name": ingredient.name,
            "unit": ingredient.unit,
        },
        "from_date": from_date,
        "to_date": to_date,
        "timezone": "America/Lima",
        "opening": value(opening),
        "incoming": value(incoming),
        "outgoing": value(outgoing),
        "closing": value(closing),
        "history_available": oldest is not None,
        "reconciled": closing == opening + incoming - outgoing,
        "total": total,
        "limit": limit,
        "offset": offset,
        "rows": [
            {
                "id": row.id,
                "created_at": (
                    row.created_at.replace(tzinfo=timezone.utc)
                    if row.created_at.tzinfo is None
                    else row.created_at
                )
                .astimezone(LIMA)
                .isoformat(),
                "kind": row.kind,
                "reference": row.source_key,
                "reason": row.reason,
                "responsible": name,
                "incoming": value(max(row.quantity, Decimal(0))),
                "outgoing": value(max(-row.quantity, Decimal(0))),
                "balance": value(row.balance_after),
            }
            for row, name in records
        ],
    }
