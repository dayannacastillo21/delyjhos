from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated
import secrets
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, func, inspect, delete
from app.models import (
    User,
    Role,
    AuthSession,
    LoginAttempt,
    Category,
    Customer,
    Product,
    ProductImage,
    Ingredient,
    Recipe,
    RecipeIngredient,
    Supplier,
    Purchase,
    PurchaseItem,
    Order,
    OrderItem,
    Payment,
    InventoryMovement,
    ProductionTask,
    QuoteRequest,
    AuditLog,
    BusinessSetting,
)
from app.schemas.business import (
    Login,
    UserWrite,
    UserUpdate,
    CategoryWrite,
    ProductWrite,
    CustomerWrite,
    IngredientWrite,
    RecipeWrite,
    SupplierWrite,
    PurchaseWrite,
    TaskWrite,
    QuoteUpdate,
    PublicOrder,
    QuoteWrite,
    StatusWrite,
    PaymentWrite,
    Adjustment,
    Estimate,
    BusinessWrite,
    ConvertQuote,
    ProductImageWrite,
    TrackingInput,
    OrderWrite,
)
from app.security import (
    DB,
    Actor,
    authenticate,
    require,
    role_name,
    user_data,
    digest,
    utcnow,
    password_hash,
)
from app.services import (
    business_today,
    get_or_404,
    audit,
    cents,
    recipe_cost,
    create_order,
    transition_order,
    record_payment,
    receive_purchase,
)
from app.config import settings
from app.models.snacks import Snack, SnackPresentation, SnackQuote
from app.schemas.snacks import SnackWrite, PresentationWrite, SnackQuoteUpdate

router = APIRouter(prefix="/api/v1")


def row_data(row):
    return jsonable_encoder(
        {
            c.key: getattr(row, c.key)
            for c in inspect(type(row)).columns
            if c.key not in {"password_hash", "token_hash", "tracking_hash"}
        },
        custom_encoder={Decimal: str},
    )


def order_data(db, order):
    result = row_data(order)
    result["items"] = [
        row_data(x)
        for x in db.scalars(select(OrderItem).where(OrderItem.order_id == order.id))
    ]
    result["payments"] = [
        row_data(x)
        for x in db.scalars(
            select(Payment)
            .where(Payment.order_id == order.id)
            .order_by(Payment.created_at)
        )
    ]
    paid = sum((Decimal(x["amount"]) for x in result["payments"]), Decimal(0))
    result["paid"] = str(paid)
    result["balance"] = str(order.total - paid)
    result["customer_name"] = db.get(Customer, order.customer_id).name
    return result


def commit(db):
    db.commit()


@router.post("/auth/login", tags=["Autenticación"])
def login(data: Login, request: Request, db: DB):
    return authenticate(data, request, db)


@router.get("/auth/me", tags=["Autenticación"])
def me(db: DB, actor: Actor):
    return user_data(actor, db)


@router.post("/auth/logout", tags=["Autenticación"])
def logout(request: Request, db: DB, actor: Actor):
    token = request.headers.get("authorization", "").split(" ", 1)[-1]
    db.execute(delete(AuthSession).where(AuthSession.token_hash == digest(token)))
    commit(db)
    return {"message": "Sesión cerrada"}


@router.get("/settings", tags=["Público"])
def public_settings(db: DB):
    row = db.get(BusinessSetting, 1)
    return {
        **(
            row_data(row)
            if row
            else {
                "name": "DelyJhos",
                "whatsapp_number": settings.whatsapp_number,
                "demo_catalog": True,
            }
        ),
        "currency": "PEN",
    }


@router.get("/categories/", tags=["Catálogo"])
def categories(db: DB):
    return [
        row_data(x)
        for x in db.scalars(
            select(Category).where(Category.is_active.is_(True)).order_by(Category.name)
        )
    ]


@router.get("/products/", tags=["Catálogo"])
def products(
    db: DB,
    q: str = Query(default="", max_length=100),
    category_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    stmt = (
        select(Product)
        .join(Category)
        .where(Product.is_active.is_(True), Category.is_active.is_(True))
    )
    if q:
        stmt = stmt.where(
            Product.name.ilike("%" + q.replace("%", "").replace("_", "") + "%")
        )
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    return [
        row_data(x)
        for x in db.scalars(
            stmt.order_by(Product.is_featured.desc(), Product.name, Product.id)
            .limit(limit)
            .offset(offset)
        )
    ]


@router.get("/products/{id}", tags=["Catálogo"])
def product_detail(id: int, db: DB):
    p = get_or_404(db, Product, id)
    if not p.is_active or not db.get(Category, p.category_id).is_active:
        raise HTTPException(404, "Producto no disponible")
    result = row_data(p)
    result["images"] = [
        row_data(x)
        for x in db.scalars(select(ProductImage).where(ProductImage.product_id == id))
    ]
    return result


def public_limit(db, request, kind):
    key = digest(
        f'public:{kind}:{request.client.host if request.client else "unknown"}'
    )
    count = db.scalar(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.identity == key,
            LoginAttempt.created_at > utcnow() - timedelta(hours=1),
        )
    )
    if count >= 15:
        raise HTTPException(429, "Demasiadas solicitudes. Intenta más tarde.")
    db.add(LoginAttempt(identity=key))
    db.commit()


@router.post("/orders/", tags=["Pedidos públicos"], status_code=201)
def public_order(data: PublicOrder, request: Request, db: DB):
    public_limit(db, request, "order")
    customer = Customer(**data.customer.model_dump(exclude={"notes"}))
    db.add(customer)
    db.flush()
    order, tracking = create_order(db, data, customer.id)
    commit(db)
    return {
        "id": order.id,
        "status": order.status,
        "total": str(order.total),
        "tracking_token": tracking,
    }


@router.post("/tracking", tags=["Pedidos públicos"])
def tracking(data: TrackingInput, request: Request, db: DB):
    token = data.token
    if len(token) > 100:
        raise HTTPException(404, "Código inválido")
    # Capability token exposes only operational status, never customer information.
    order = db.scalar(select(Order).where(Order.tracking_hash == digest(token)))
    if not order:
        raise HTTPException(404, "Pedido no encontrado")
    return {"id": order.id, "status": order.status, "due_date": order.due_date}


@router.post("/quotes/", tags=["Cotizaciones"], status_code=201)
def public_quote(data: QuoteWrite, request: Request, db: DB):
    public_limit(db, request, "quote")
    if data.due_date < business_today():
        raise HTTPException(422, "La fecha no puede estar en el pasado")
    existing = db.scalar(
        select(QuoteRequest.id).where(QuoteRequest.request_key == data.request_key)
    )
    if existing:
        raise HTTPException(409, "La solicitud ya fue registrada")
    quote = QuoteRequest(**data.model_dump())
    db.add(quote)
    db.flush()
    commit(db)
    return {
        "id": quote.id,
        "status": quote.status,
        "message": "Solicitud recibida; el precio y disponibilidad requieren confirmación.",
    }


@router.post("/uploads", tags=["Imágenes"], status_code=201)
async def upload(request: Request, db: DB, file: Annotated[UploadFile, File()]):
    from PIL import Image, UnidentifiedImageError
    from io import BytesIO

    public_limit(db, request, "upload")
    content = await file.read(5 * 1024 * 1024 + 1)
    await file.close()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "La imagen debe pesar menos de 5 MB")
    try:
        with Image.open(BytesIO(content)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError()
            if image.width * image.height > 16000000:
                raise ValueError()
            image.load()
            image = image.convert("RGB")
            image.thumbnail((1600, 1600))
            settings.upload_dir.mkdir(parents=True, exist_ok=True)
            name = secrets.token_hex(24) + ".jpg"
            image.save(settings.upload_dir / name, "JPEG", quality=88)
    except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError):
        raise HTTPException(
            422, "Carga una imagen JPG, PNG o WebP válida de hasta 16 megapíxeles"
        )
    commit(db)
    return {"url": "/uploads/" + name}


RESOURCES = {
    "snacks": (Snack, SnackWrite),
    "snack-presentations": (SnackPresentation, PresentationWrite),
    "snack-quotes": (SnackQuote, SnackQuoteUpdate),
    "product-images": (ProductImage, ProductImageWrite),
    "categories": (Category, CategoryWrite),
    "products": (Product, ProductWrite),
    "customers": (Customer, CustomerWrite),
    "ingredients": (Ingredient, IngredientWrite),
    "suppliers": (Supplier, SupplierWrite),
    "recipes": (Recipe, RecipeWrite),
    "purchases": (Purchase, PurchaseWrite),
    "production": (ProductionTask, TaskWrite),
    "orders": (Order, OrderWrite),
    "quotes": (QuoteRequest, QuoteUpdate),
    "payments": (Payment, None),
    "movements": (InventoryMovement, None),
    "audit": (AuditLog, None),
}


def access(db, actor, resource, write=False):
    role = role_name(actor, db)
    if role in {"admin", "manager"}:
        return
    allowed = {
        "sales": {
            "customers",
            "orders",
            "quotes",
            "payments",
            "products",
            "categories",
        },
        "production": {
            "orders",
            "production",
            "ingredients",
            "recipes",
            "products",
            "categories",
            "movements",
        },
    }
    writable = {
        "sales": {"customers", "orders", "quotes"},
        "production": {"production"},
    }
    if resource not in (writable if write else allowed).get(role, set()):
        raise HTTPException(403, "No tienes permiso para este módulo")


def serialize(db, resource, row):
    if resource == "orders":
        return order_data(db, row)
    result = row_data(row)
    if resource == "recipes":
        result["items"] = [
            row_data(x)
            for x in db.scalars(
                select(RecipeIngredient).where(RecipeIngredient.recipe_id == row.id)
            )
        ]
    if resource == "purchases":
        result["items"] = [
            row_data(x)
            for x in db.scalars(
                select(PurchaseItem).where(PurchaseItem.purchase_id == row.id)
            )
        ]
    return result


@router.get("/admin/users", tags=["Usuarios"])
def list_users(db: DB, actor: Actor):
    require(actor, db, "admin")
    return [
        user_data(u, db) for u in db.scalars(select(User).order_by(User.id).limit(200))
    ]


@router.post("/admin/users", tags=["Usuarios"], status_code=201)
def add_user(data: UserWrite, db: DB, actor: Actor):
    require(actor, db, "admin")
    role = db.scalar(select(Role).where(Role.name == data.role))
    user = User(
        name=data.name,
        email=str(data.email).lower(),
        role_id=role.id,
        password_hash=password_hash.hash(data.password),
    )
    db.add(user)
    db.flush()
    audit(db, actor, "create", "users", user.id)
    commit(db)
    return user_data(user, db)


@router.put("/admin/users/{id}", tags=["Usuarios"])
def update_user(id: int, data: UserUpdate, db: DB, actor: Actor):
    require(actor, db, "admin")
    # Serialize role changes so concurrent requests cannot remove all administrators.
    db.scalars(select(Role).where(Role.name == "admin").with_for_update()).all()
    user = get_or_404(db, User, id, True)
    if user.id == actor.id and (not data.is_active or data.role != "admin"):
        raise HTTPException(
            409, "No puedes desactivar ni quitar tu propio acceso administrativo"
        )
    user.name = data.name
    user.is_active = data.is_active
    user.role_id = db.scalar(select(Role.id).where(Role.name == data.role))
    if data.password:
        user.password_hash = password_hash.hash(data.password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    audit(db, actor, "update", "users", id)
    commit(db)
    return user_data(user, db)


@router.get("/admin/{resource}", tags=["Administración"])
def list_resource(
    resource: str,
    db: DB,
    actor: Actor,
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    if resource not in RESOURCES:
        raise HTTPException(404, "Módulo inexistente")
    access(db, actor, resource)
    model = RESOURCES[resource][0]
    rows = db.scalars(
        select(model).order_by(model.id.desc()).limit(limit).offset(offset)
    ).all()
    if resource == "orders":
        return batch_orders(db, rows, actor)
    return [safe_serialize(db, actor, resource, row) for row in rows]


@router.get("/admin/{resource}/{id}", tags=["Administración"])
def get_resource(resource: str, id: int, db: DB, actor: Actor):
    if resource not in RESOURCES:
        raise HTTPException(404, "Módulo inexistente")
    access(db, actor, resource)
    return safe_serialize(
        db, actor, resource, get_or_404(db, RESOURCES[resource][0], id)
    )


def validate_payload(schema, payload):
    from pydantic import ValidationError
    from fastapi.exceptions import RequestValidationError

    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors())


@router.post("/admin/{resource}", tags=["Administración"], status_code=201)
def create_resource(resource: str, payload: dict, db: DB, actor: Actor):
    if resource not in RESOURCES or resource in {
        "quotes",
        "snack-quotes",
        "payments",
        "movements",
        "audit",
    }:
        raise HTTPException(405, "Creación no permitida")
    access(db, actor, resource, True)
    model, schema = RESOURCES[resource]
    data = validate_payload(schema, payload)
    if resource == "product-images":
        get_or_404(db, Product, data.product_id)
    if resource == "orders":
        row, tracking_token = create_order(db, data)
    elif resource == "recipes":
        get_or_404(db, Product, data.product_id, True)
        row = Recipe(**data.model_dump(exclude={"items"}))
        db.add(row)
        db.flush()
        for line in data.items:
            get_or_404(db, Ingredient, line.ingredient_id)
            db.add(RecipeIngredient(recipe_id=row.id, **line.model_dump()))
    elif resource == "purchases":
        get_or_404(db, Supplier, data.supplier_id)
        row = Purchase(
            supplier_id=data.supplier_id,
            reference=data.reference,
            total=cents(
                sum((x.quantity * x.unit_cost for x in data.items), Decimal(0))
            ),
        )
        db.add(row)
        db.flush()
        for line in data.items:
            get_or_404(db, Ingredient, line.ingredient_id)
            db.add(PurchaseItem(purchase_id=row.id, **line.model_dump()))
    else:
        if resource == "production":
            get_or_404(db, Order, data.order_id)
            if data.assigned_to:
                get_or_404(db, User, data.assigned_to)
        row = model(**data.model_dump())
        db.add(row)
        db.flush()
    audit(db, actor, "create", resource, row.id)
    db.flush()
    result = serialize(db, resource, row)
    if resource == "orders":
        result["tracking_token"] = tracking_token
    commit(db)
    return result


@router.put("/admin/{resource}/{id}", tags=["Administración"])
def update_resource(resource: str, id: int, payload: dict, db: DB, actor: Actor):
    if resource not in {
        "snacks",
        "snack-presentations",
        "snack-quotes",
        "categories",
        "products",
        "product-images",
        "customers",
        "ingredients",
        "suppliers",
        "recipes",
        "production",
        "quotes",
    }:
        raise HTTPException(
            405,
            "Este registro utiliza acciones específicas y no se puede editar directamente",
        )
    access(db, actor, resource, True)
    model, schema = RESOURCES[resource]
    data = validate_payload(schema, payload)
    if resource == "product-images":
        get_or_404(db, Product, data.product_id)
    if resource == "recipes":
        get_or_404(db, Product, data.product_id, True)
    row = get_or_404(db, model, id, True)
    if resource == "ingredients" and data.unit != row.unit:
        used = db.scalar(
            select(func.count())
            .select_from(InventoryMovement)
            .where(InventoryMovement.ingredient_id == id)
        )
        recipe_used = db.scalar(
            select(func.count())
            .select_from(RecipeIngredient)
            .where(RecipeIngredient.ingredient_id == id)
        )
        purchase_used = db.scalar(
            select(func.count())
            .select_from(PurchaseItem)
            .where(PurchaseItem.ingredient_id == id)
        )
        if used or recipe_used or purchase_used:
            raise HTTPException(
                409,
                "No cambies la unidad de un ingrediente utilizado; crea otro ingrediente",
            )
    if resource == "production":
        get_or_404(db, Order, data.order_id)
        if data.assigned_to:
            get_or_404(db, User, data.assigned_to)
    for key, value in data.model_dump(exclude={"items"}).items():
        setattr(row, key, value)
    if resource == "recipes":
        db.execute(delete(RecipeIngredient).where(RecipeIngredient.recipe_id == id))
        db.flush()
        for line in data.items:
            get_or_404(db, Ingredient, line.ingredient_id)
            db.add(RecipeIngredient(recipe_id=id, **line.model_dump()))
    audit(db, actor, "update", resource, id)
    db.flush()
    result = serialize(db, resource, row)
    commit(db)
    return result


@router.post("/admin/orders/{id}/status", tags=["Pedidos"])
def order_status(id: int, data: StatusWrite, db: DB, actor: Actor):
    require(actor, db, "admin", "manager", "sales", "production")
    if role_name(actor, db) == "production" and data.status not in {
        "production",
        "ready",
    }:
        raise HTTPException(
            403, "Producción solo puede iniciar o terminar la elaboración"
        )
    row = transition_order(db, id, data.status, actor)
    commit(db)
    return safe_serialize(db, actor, "orders", row)


@router.post("/admin/orders/{id}/payments", tags=["Pagos"], status_code=201)
def payment(id: int, data: PaymentWrite, db: DB, actor: Actor):
    require(actor, db, "admin", "manager", "sales")
    row = record_payment(db, id, data, actor)
    commit(db)
    return row_data(row)


@router.post("/admin/purchases/{id}/receive", tags=["Compras"])
def receive(id: int, db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    row = receive_purchase(db, id, actor)
    commit(db)
    return serialize(db, "purchases", row)


@router.post("/admin/inventory/adjust", tags=["Inventario"], status_code=201)
def adjust(data: Adjustment, db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    ingredient = get_or_404(db, Ingredient, data.ingredient_id, True)
    key = "adjust:" + data.idempotency_key
    existing = db.scalar(
        select(InventoryMovement).where(InventoryMovement.source_key == key)
    )
    if existing:
        if (
            existing.ingredient_id != data.ingredient_id
            or existing.quantity != data.quantity
            or existing.reason != data.reason
        ):
            raise HTTPException(409, "Clave de ajuste reutilizada")
        return row_data(existing)
    if ingredient.stock + data.quantity < 0:
        raise HTTPException(409, "El ajuste dejaría stock negativo")
    ingredient.stock += data.quantity
    row = InventoryMovement(
        ingredient_id=ingredient.id,
        quantity=data.quantity,
        balance_after=ingredient.stock,
        kind="adjustment",
        reason=data.reason,
        source_key=key,
        created_by=actor.id,
    )
    db.add(row)
    db.flush()
    audit(db, actor, "adjust", "ingredients", ingredient.id, data.reason)
    commit(db)
    return row_data(row)


@router.post("/tools/estimate", tags=["Costos"])
def estimate(data: Estimate, db: DB, actor: Actor):
    require(actor, db, "admin", "manager", "sales")
    cost, _ = recipe_cost(db, data.product_id)
    total = cost * data.quantity + data.decoration_cost
    sale = total / (1 - data.margin / 100)
    return {
        "cost": str(cents(total)),
        "suggested_price": str(cents(sale)),
        "estimated_profit": str(cents(sale - total)),
        "margin": str(data.margin),
    }


@router.get("/reports/dashboard", tags=["Reportes"])
def dashboard(db: DB, actor: Actor):
    require(actor, db, "admin", "manager", "sales", "production")
    from datetime import datetime, time, timezone
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("America/Lima")
    today = datetime.now(tz).date()

    def bounds(day):
        return (
            datetime.combine(day, time.min, tzinfo=tz).astimezone(timezone.utc),
            datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz).astimezone(
                timezone.utc
            ),
        )

    start, end = bounds(today)
    by_status = dict(
        db.execute(select(Order.status, func.count()).group_by(Order.status)).all()
    )
    low = db.scalars(
        select(Ingredient)
        .where(Ingredient.stock <= Ingredient.minimum_stock)
        .order_by(Ingredient.name)
        .limit(200)
    ).all()
    next_orders = db.scalars(
        select(Order)
        .where(Order.status.notin_(["cancelled", "delivered"]))
        .order_by(Order.due_date, Order.id)
        .limit(15)
    ).all()
    result = {
        "orders_today": db.scalar(
            select(func.count())
            .select_from(Order)
            .where(Order.created_at >= start, Order.created_at < end)
        ),
        "in_production": by_status.get("production", 0),
        "active_orders": sum(
            v for k, v in by_status.items() if k not in {"cancelled", "delivered"}
        ),
        "low_stock": [row_data(x) for x in low],
        "upcoming": batch_orders(db, next_orders, actor),
        "by_status": {
            status: by_status.get(status, 0)
            for status in [
                "pending",
                "confirmed",
                "production",
                "ready",
                "delivered",
                "cancelled",
            ]
        },
    }
    if role_name(actor, db) == "production":
        return result
    collected = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.created_at >= start, Payment.created_at < end
        )
    )
    result["collected_today"] = str(collected)
    result["sales_total"] = str(
        db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.status == "delivered"
            )
        )
    )
    result["estimated_profit"] = str(
        db.scalar(
            select(
                func.coalesce(func.sum(Order.total - Order.estimated_cost), 0)
            ).where(Order.status == "delivered")
        )
    )
    daily = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        lo, hi = bounds(day)
        amount = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.created_at >= lo, Payment.created_at < hi
            )
        )
        daily.append({"date": str(day), "amount": str(amount)})
    result["daily_sales"] = daily
    tops = db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("quantity"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status == "delivered")
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    ).all()
    result["top_products"] = [
        {"name": x.product_name, "quantity": x.quantity, "revenue": str(x.revenue)}
        for x in tops
    ]
    return result


@router.get("/reports/demand", tags=["Reportes"])
def demand(db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    first = db.scalar(select(func.min(Order.created_at)))
    completed = db.scalar(
        select(func.count()).select_from(Order).where(Order.status == "delivered")
    )
    if not first or (date.today() - first.date()).days < 56 or completed < 30:
        return {
            "available": False,
            "message": "Se necesitan al menos 8 semanas y 30 pedidos entregados. No se generan predicciones sin historia suficiente.",
        }
    cutoff = date.today() - timedelta(days=56)
    rows = db.execute(
        select(OrderItem.product_name, func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status == "delivered", Order.due_date >= cutoff)
        .group_by(OrderItem.product_name)
    ).all()
    return {
        "available": True,
        "method": "Promedio semanal de unidades entregadas durante las últimas 8 semanas; estimación descriptiva, no garantía de demanda.",
        "products": [
            {"name": r[0], "weekly_estimate": round(float(r[1]) / 8, 1)} for r in rows
        ],
    }


def safe_serialize(db, actor, resource, row):
    result = serialize(db, resource, row)
    if resource == "orders" and role_name(actor, db) == "production":
        return {
            k: result[k]
            for k in [
                "id",
                "customer_name",
                "due_date",
                "status",
                "notes",
                "stock_consumed",
            ]
        } | {
            "items": [
                {k: i[k] for k in ["product_id", "product_name", "quantity"]}
                for i in result["items"]
            ]
        }
    return result


@router.get("/business/settings", tags=["Configuración"])
def business_settings(db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    return public_settings(db)


@router.put("/business/settings", tags=["Configuración"])
def save_business_settings(data: BusinessWrite, db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    row = db.get(BusinessSetting, 1)
    if not row:
        row = BusinessSetting(id=1, **data.model_dump())
        db.add(row)
    else:
        for key, value in data.model_dump().items():
            setattr(row, key, value)
    audit(db, actor, "update", "business_settings", 1)
    commit(db)
    return public_settings(db)


@router.post("/admin/quotes/{id}/convert", tags=["Cotizaciones"], status_code=201)
def convert_quote(id: int, data: ConvertQuote, db: DB, actor: Actor):
    require(actor, db, "admin", "manager", "sales")
    quote = get_or_404(db, QuoteRequest, id, True)
    if quote.order_id:
        raise HTTPException(409, "La cotización ya tiene un pedido asociado")
    if quote.status not in {"quoted", "accepted"} or quote.quoted_price is None:
        raise HTTPException(
            409,
            "Define primero el precio y marca la cotización como cotizada o aceptada",
        )
    customer = Customer(
        name=quote.name, phone=quote.phone, notes="Cotización #" + str(id)
    )
    db.add(customer)
    db.flush()
    order_input = OrderWrite(
        customer_id=customer.id,
        due_date=quote.due_date,
        notes=f"Cotización #{id}: {quote.theme}, {quote.portions} porciones, sabor {quote.flavor}, relleno {quote.filling}. {quote.decoration}",
        items=[{"product_id": data.product_id, "quantity": data.quantity}],
        request_key="quote-conversion-" + str(id),
    )
    order, token = create_order(db, order_input)
    order.total = quote.quoted_price
    item = db.scalar(select(OrderItem).where(OrderItem.order_id == order.id))
    item.unit_price = quote.quoted_price / data.quantity
    quote.order_id = order.id
    quote.status = "accepted"
    audit(db, actor, "convert", "quote_requests", id, "Pedido #" + str(order.id))
    commit(db)
    return {"id": order.id, "tracking_token": token, "total": str(order.total)}


def batch_orders(db, orders, actor):
    if not orders:
        return []
    from collections import defaultdict

    ids = [o.id for o in orders]
    customers = {
        c.id: c.name
        for c in db.scalars(
            select(Customer).where(Customer.id.in_({o.customer_id for o in orders}))
        )
    }
    items = defaultdict(list)
    for item in db.scalars(select(OrderItem).where(OrderItem.order_id.in_(ids))):
        items[item.order_id].append(row_data(item))
    production = role_name(actor, db) == "production"
    payments = defaultdict(list)
    if not production:
        for payment in db.scalars(select(Payment).where(Payment.order_id.in_(ids))):
            payments[payment.order_id].append(row_data(payment))
    result = []
    for order in orders:
        if production:
            result.append(
                {
                    "id": order.id,
                    "customer_name": customers[order.customer_id],
                    "due_date": str(order.due_date),
                    "status": order.status,
                    "notes": order.notes,
                    "stock_consumed": order.stock_consumed,
                    "items": [
                        {k: i[k] for k in ["product_id", "product_name", "quantity"]}
                        for i in items[order.id]
                    ],
                }
            )
        else:
            row = row_data(order)
            row["customer_name"] = customers[order.customer_id]
            row["items"] = items[order.id]
            row["payments"] = payments[order.id]
            paid = sum((Decimal(x["amount"]) for x in payments[order.id]), Decimal(0))
            row["paid"] = str(paid)
            row["balance"] = str(order.total - paid)
            result.append(row)
    return result
