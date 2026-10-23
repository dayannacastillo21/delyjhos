from datetime import datetime
from zoneinfo import ZoneInfo
from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict
import secrets
from fastapi import HTTPException
from sqlalchemy import select, func
from app.models import (
    Product,
    Customer,
    Recipe,
    RecipeIngredient,
    Ingredient,
    Order,
    OrderItem,
    Payment,
    Purchase,
    PurchaseItem,
    InventoryMovement,
    AuditLog,
)
from app.security import digest, utcnow

D = Decimal


def business_today():
    return datetime.now(ZoneInfo("America/Lima")).date()


def cents(value):
    return D(value).quantize(D(".01"), rounding=ROUND_HALF_UP)


def get_or_404(db, model, id, lock=False):
    row = (
        db.scalar(select(model).where(model.id == id).with_for_update())
        if lock
        else db.get(model, id)
    )
    if row is None:
        raise HTTPException(404, "Registro no encontrado")
    return row


def audit(db, actor, action, entity, id, details=""):
    db.add(
        AuditLog(
            user_id=actor.id,
            action=action,
            entity=entity,
            entity_id=id,
            details=details,
        )
    )


def recipe_cost(db, product_id):
    recipe = db.scalar(select(Recipe).where(Recipe.product_id == product_id))
    if not recipe:
        raise HTTPException(
            409,
            "El producto necesita una receta para calcular costos y consumir inventario",
        )
    lines = db.scalars(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id)
    ).all()
    if not lines:
        raise HTTPException(409, "La receta está vacía")
    snapshot = {}
    ingredient_cost = D(0)
    for line in lines:
        ingredient = get_or_404(db, Ingredient, line.ingredient_id)
        quantity = line.quantity / recipe.yield_quantity
        snapshot[str(ingredient.id)] = str(quantity)
        ingredient_cost += quantity * ingredient.unit_cost
    cost = ingredient_cost + (D(recipe.labor_cost) + D(recipe.overhead_cost)) / D(
        recipe.yield_quantity
    )
    return cost, snapshot


def create_order(db, data, customer_id=None):
    if db.scalar(select(Order.id).where(Order.request_key == data.request_key)):
        raise HTTPException(
            409,
            "Esta solicitud ya fue registrada. Usa el código de seguimiento recibido.",
        )
    if data.due_date < business_today():
        raise HTTPException(422, "La entrega no puede estar en el pasado")
    if customer_id is None:
        customer_id = data.customer_id
    get_or_404(db, Customer, customer_id)
    ids = [line.product_id for line in data.items]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "Combina las cantidades de productos repetidos")
    # Lock products in stable order: prices stay consistent throughout this transaction.
    locked = {
        p.id: p
        for p in db.scalars(
            select(Product)
            .where(Product.id.in_(sorted(ids)))
            .order_by(Product.id)
            .with_for_update()
        ).all()
    }
    total = D(0)
    pending = []
    for line in data.items:
        product = locked.get(line.product_id)
        if not product or not product.is_active:
            raise HTTPException(422, "Un producto ya no está disponible")
        from app.models import Category

        if not db.get(Category, product.category_id).is_active:
            raise HTTPException(422, "Categoría inactiva")
        total += product.price * line.quantity
        pending.append((line, product))
    token = secrets.token_urlsafe(32)
    order = Order(
        customer_id=customer_id,
        status="pending",
        due_date=data.due_date,
        notes=data.notes,
        total=cents(total),
        estimated_cost=0,
        tracking_hash=digest(token),
        request_key=data.request_key,
    )
    db.add(order)
    db.flush()
    for line, product in pending:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=line.quantity,
                unit_price=product.price,
                unit_cost=0,
                ingredients_snapshot={},
            )
        )
    db.flush()
    return order, token


TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"production", "cancelled"},
    "production": {"ready", "cancelled"},
    "ready": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


def transition_order(db, id, status, actor):
    order = get_or_404(db, Order, id, True)
    if order.status == status:
        return order
    if status not in TRANSITIONS[order.status]:
        raise HTTPException(409, f"Transición no permitida: {order.status} → {status}")
    if status == "confirmed":
        total_cost = D(0)
        items = db.scalars(
            select(OrderItem)
            .where(OrderItem.order_id == id)
            .order_by(OrderItem.product_id)
        ).all()
        for item in items:
            get_or_404(db, Product, item.product_id, True)
            cost, snapshot = recipe_cost(db, item.product_id)
            item.unit_cost = cost
            item.ingredients_snapshot = snapshot
            total_cost += cost * item.quantity
        order.estimated_cost = cents(total_cost)
    if status == "production" and not order.stock_consumed:
        required = defaultdict(Decimal)
        items = db.scalars(select(OrderItem).where(OrderItem.order_id == id)).all()
        for item in items:
            if not item.ingredients_snapshot:
                raise HTTPException(409, "Pedido sin receta confirmada")
            for ingredient_id, quantity in item.ingredients_snapshot.items():
                # Round up consumption to the inventory unit precision; never under-deduct.
                from decimal import ROUND_CEILING

                required[int(ingredient_id)] += D(quantity) * item.quantity
        for ingredient_id in sorted(required):
            ingredient = get_or_404(db, Ingredient, ingredient_id, True)
            needed = required[ingredient_id].quantize(D(".001"), rounding=ROUND_CEILING)
            if ingredient.stock < needed:
                raise HTTPException(
                    409,
                    f"Stock insuficiente: {ingredient.name}. Disponible {ingredient.stock} {ingredient.unit}, requerido {needed}",
                )
            ingredient.stock -= needed
            db.add(
                InventoryMovement(
                    ingredient_id=ingredient_id,
                    quantity=-needed,
                    balance_after=ingredient.stock,
                    kind="production",
                    reason=f"Producción del pedido #{id}",
                    source_key=f"order:{id}",
                    created_by=actor.id,
                )
            )
        order.stock_consumed = True
    if status == "delivered":
        paid = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.order_id == id
            )
        )
        if paid < order.total:
            raise HTTPException(409, "Registra el saldo pendiente antes de entregar")
    previous = order.status
    order.status = status
    audit(db, actor, "status", "orders", id, f"{previous} → {status}")
    db.flush()
    return order


def record_payment(db, id, data, actor):
    order = get_or_404(db, Order, id, True)
    previous = db.scalar(
        select(Payment).where(Payment.idempotency_key == data.idempotency_key)
    )
    if previous:
        if (
            previous.order_id != id
            or previous.amount != data.amount
            or previous.method != data.method
            or previous.reference != data.reference
        ):
            raise HTTPException(409, "Clave de pago ya utilizada con otros datos")
        return previous
    if order.status == "cancelled":
        raise HTTPException(409, "No se puede pagar un pedido cancelado")
    paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.order_id == id)
    )
    if data.amount > order.total - paid:
        raise HTTPException(409, "El pago supera el saldo pendiente")
    payment = Payment(order_id=id, **data.model_dump(), created_by=actor.id)
    db.add(payment)
    db.flush()
    audit(db, actor, "payment", "orders", id, str(data.amount))
    return payment


def receive_purchase(db, id, actor):
    purchase = get_or_404(db, Purchase, id, True)
    if purchase.status == "received":
        return purchase
    lines = db.scalars(
        select(PurchaseItem)
        .where(PurchaseItem.purchase_id == id)
        .order_by(PurchaseItem.ingredient_id)
    ).all()
    for line in lines:
        ingredient = get_or_404(db, Ingredient, line.ingredient_id, True)
        new_stock = ingredient.stock + line.quantity
        ingredient.unit_cost = (
            ingredient.stock * ingredient.unit_cost + line.quantity * line.unit_cost
        ) / new_stock
        ingredient.stock = new_stock
        db.add(
            InventoryMovement(
                ingredient_id=ingredient.id,
                quantity=line.quantity,
                balance_after=new_stock,
                kind="purchase",
                reason=f"Compra #{id}",
                source_key=f"purchase:{id}",
                created_by=actor.id,
            )
        )
    purchase.status = "received"
    purchase.received_at = utcnow()
    audit(db, actor, "receive", "purchases", id)
    db.flush()
    return purchase
