from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from app.security import DB, Actor, require
from app.models.snacks import Snack, SnackPresentation, SnackQuote
from app.schemas.snacks import SnackQuoteWrite
from app.services import business_today

router = APIRouter(prefix="/api/v1", tags=["Bocaditos"])


@router.get("/snacks")
def list_snacks(
    db: DB, limit: int = Query(100, ge=1, le=100), offset: int = Query(0, ge=0)
):
    return catalog_data(db, limit, offset, published_only=True)


@router.get("/snacks/preview")
def preview_snacks(
    db: DB,
    actor: Actor,
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    require(actor, db, "admin", "manager")
    return catalog_data(db, limit, offset, published_only=False)


def catalog_data(db, limit, offset, published_only):
    statement = select(Snack)
    if published_only:
        statement = statement.where(Snack.is_published.is_(True))
    rows = db.scalars(
        statement.order_by(Snack.kind, Snack.name).limit(limit).offset(offset)
    ).all()
    variants = (
        db.scalars(
            select(SnackPresentation)
            .where(SnackPresentation.snack_id.in_([x.id for x in rows]))
            .order_by(SnackPresentation.units)
        ).all()
        if rows
        else []
    )
    return [
        {
            "id": x.id,
            "name": x.name,
            "kind": x.kind,
            "description": x.description,
            "image_url": x.image_url,
            "is_available": x.is_available,
            "presentations": [
                {
                    "id": v.id,
                    "units": v.units,
                    "price": (
                        str(v.current_price)
                        if v.price_confirmed and v.current_price is not None
                        else None
                    ),
                }
                for v in variants
                if v.snack_id == x.id
            ],
        }
        for x in rows
    ]


@router.post("/snack-quotes", status_code=201)
def create_snack_quote(data: SnackQuoteWrite, db: DB):
    existing = db.scalar(
        select(SnackQuote.id).where(SnackQuote.request_key == data.request_key)
    )
    if existing:
        raise HTTPException(
            409, "La solicitud ya fue recibida; no es necesario repetirla"
        )
    if data.due_date < business_today():
        raise HTTPException(422, "Selecciona una fecha futura")
    lines = []
    for item in data.items:
        variant = db.get(SnackPresentation, item.presentation_id)
        snack = db.get(Snack, variant.snack_id) if variant else None
        if snack is None or not snack.is_published:
            raise HTTPException(
                422, "Una presentación ya no está disponible en el catálogo"
            )
        lines.append(
            {
                "presentation_id": variant.id,
                "snack_id": snack.id,
                "name": snack.name,
                "kind": snack.kind,
                "units": variant.units,
                "packs": item.packs,
                "price": (
                    str(variant.current_price)
                    if variant.price_confirmed and variant.current_price is not None
                    else None
                ),
                "availability_confirmed": snack.is_available,
            }
        )
    row = SnackQuote(**data.model_dump(exclude={"items"}), items=lines)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "status": row.status,
        "message": "Propuesta recibida. Confirmaremos disponibilidad y precio antes de crear el pedido.",
    }
