from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select
from app.models import Customer, OrderItem, ProductionTask
from app.models.snacks import SnackQuote, SnackPresentation
from app.schemas.business import OrderWrite
from app.services import get_or_404, cents, create_order, recipe_cost, audit


def convert_snack_quote(db, id, data, actor):
    quote = get_or_404(db, SnackQuote, id, True)
    if quote.order_id:
        raise HTTPException(409, "Esta propuesta ya tiene un pedido asociado")
    if quote.status != "accepted" or quote.quoted_price is None:
        raise HTTPException(
            409,
            "Registra el precio revisado y la aceptación del cliente antes de convertir",
        )
    original = {line["presentation_id"]: line for line in quote.items}
    if set(original) != {line.presentation_id for line in data.items}:
        raise HTTPException(
            422,
            "Revisa todas las presentaciones solicitadas; no omitas ni agregues variedades al convertir",
        )
    total = cents(
        sum((line.unit_price * line.packs for line in data.items), Decimal(0))
    )
    if total != quote.quoted_price:
        raise HTTPException(
            409,
            f"El desglose suma S/ {total:.2f}; debe coincidir con S/ {quote.quoted_price:.2f} aceptados",
        )
    reviewed = []
    for line in sorted(data.items, key=lambda x: x.product_id):
        snapshot = original[line.presentation_id]
        variant = get_or_404(db, SnackPresentation, line.presentation_id, True)
        if (
            variant.units != snapshot["units"]
            or variant.snack_id != snapshot["snack_id"]
        ):
            raise HTTPException(
                409,
                "Una presentación cambió desde la solicitud; revisa la propuesta antes de convertir",
            )
        # The selected product recipe represents one complete presentation, not one snack.
        recipe_cost(db, line.product_id)
        reviewed.append(
            {
                **snapshot,
                "product_id": line.product_id,
                "packs": line.packs,
                "price": str(line.unit_price),
                "subtotal": str(cents(line.unit_price * line.packs)),
                "availability_confirmed": True,
            }
        )
    customer = Customer(
        name=quote.name, phone=quote.phone, notes=f"Mesa de bocaditos #{id}"
    )
    db.add(customer)
    db.flush()
    order, token = create_order(
        db,
        OrderWrite(
            customer_id=customer.id,
            due_date=quote.due_date,
            notes=f"Mesa #{id}. Celebración: {quote.celebration}. Invitados: {quote.guests}. {quote.comments}",
            request_key=f"snack-quote-conversion-{id}",
            items=[
                {"product_id": line.product_id, "quantity": line.packs}
                for line in data.items
            ],
        ),
        approved_prices={line.product_id: line.unit_price for line in data.items},
    )
    by_product = {x["product_id"]: x for x in reviewed}
    for item in db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)):
        line = by_product[item.product_id]
        suffix = f" · {line['units']} unidades"
        item.product_name = line["name"][: 150 - len(suffix)] + suffix
    quote.reviewed_items = reviewed
    quote.order_id = order.id
    db.add(
        ProductionTask(
            order_id=order.id,
            title="Mesa de bocaditos",
            due_date=order.due_date,
            notes=f"Propuesta #{id}. Cantidades por paquete y recetas en el pedido. Confirmar el pedido antes de iniciar producción.",
        )
    )
    audit(
        db,
        actor,
        "convert",
        "snack_quotes",
        id,
        f"Pedido #{order.id}, total S/ {total:.2f}; disponibilidad y presentaciones revisadas",
    )
    db.flush()
    return order, token
