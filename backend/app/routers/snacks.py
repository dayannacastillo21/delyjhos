from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select
import secrets
from app.models import Order
from app.schemas.business import TrackingInput
from app.security import DB, Actor, require, digest, public_limit
from app.models.snacks import Snack, SnackPresentation, SnackQuote, SnackPackage
from app.schemas.snacks import SnackQuoteWrite, ConvertSnackQuote
from app.snack_services import convert_snack_quote
from app.services import business_today

router = APIRouter(prefix="/api/v1", tags=["Bocaditos"])


@router.post("/snack-quotes/track")
def track_quote(data: TrackingInput, request: Request, db: DB):
    public_limit(db, request, "snack-tracking", maximum=120)
    row = db.scalar(
        select(SnackQuote).where(SnackQuote.tracking_hash == digest(data.token))
    )
    if row is None:
        raise HTTPException(404, "Propuesta no encontrada; revisa el código privado")
    order = db.get(Order, row.order_id) if row.order_id else None
    return {
        "id": row.id,
        "status": row.status,
        "due_date": row.due_date,
        "quoted_price": (
            str(row.quoted_price)
            if row.quoted_price is not None and row.status in {"quoted", "accepted"}
            else None
        ),
        "items": [
            {
                key: line.get(key)
                for key in ["name", "units", "packs", "price", "subtotal"]
            }
            for line in (row.reviewed_items or row.items)
        ],
        "order_status": order.status if order else None,
    }


@router.get("/snack-packages")
def public_packages(db: DB):
    published = set(
        db.scalars(
            select(SnackPresentation.id).join(Snack).where(Snack.is_published.is_(True))
        )
    )
    return [
        {
            "id": row.id,
            "name": row.name,
            "description": row.description,
            "items": row.items,
        }
        for row in db.scalars(
            select(SnackPackage)
            .where(SnackPackage.is_published.is_(True))
            .order_by(SnackPackage.id)
        )
        if row.items and all(line["presentation_id"] in published for line in row.items)
    ]


@router.post("/admin/snack-quotes/{id}/convert", status_code=201)
def convert_quote(id: int, data: ConvertSnackQuote, db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    order, token = convert_snack_quote(db, id, data, actor)
    db.commit()
    return {"id": order.id, "tracking_token": token, "total": str(order.total)}


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
def create_snack_quote(data: SnackQuoteWrite, request: Request, db: DB):
    public_limit(db, request, "snack-quote")
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
    token = secrets.token_urlsafe(32)
    row = SnackQuote(
        **data.model_dump(exclude={"items"}), items=lines, tracking_hash=digest(token)
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "status": row.status,
        "tracking_token": token,
        "message": "Propuesta recibida. Confirmaremos disponibilidad y precio antes de crear el pedido.",
    }
