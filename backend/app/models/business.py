from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Numeric,
    DateTime,
    Date,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    JSON,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.base import Base


class Timestamp:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True)


class User(Timestamp, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    identity: Mapped[str] = mapped_column(String(320), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class Customer(Timestamp, Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(254))
    notes: Mapped[str | None] = mapped_column(Text)


class Product(Timestamp, Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("price >= 0", name="price_positive"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    slug: Mapped[str] = mapped_column(String(170), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    image_url: Mapped[str | None] = mapped_column(String(500))


class ProductImage(Base):
    __tablename__ = "product_images"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    alt: Mapped[str] = mapped_column(String(200), default="")


class Ingredient(Timestamp, Base):
    __tablename__ = "ingredients"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="stock_nonnegative"),
        CheckConstraint(
            "unit_cost >= 0 AND minimum_stock >= 0", name="cost_minimum_nonnegative"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    unit: Mapped[str] = mapped_column(String(20))
    stock: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0)
    minimum_stock: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0)


class Recipe(Timestamp, Base):
    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint(
            "yield_quantity > 0 AND labor_cost >= 0 AND overhead_cost >= 0",
            name="cost_yield_valid",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    yield_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=1)
    labor_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    overhead_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    instructions: Mapped[str] = mapped_column(Text, default="")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (
        UniqueConstraint("recipe_id", "ingredient_id"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), index=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))


class Supplier(Timestamp, Base):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30), default="")
    email: Mapped[str | None] = mapped_column(String(254))
    notes: Mapped[str | None] = mapped_column(Text)


class Purchase(Timestamp, Base):
    __tablename__ = "purchases"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    reference: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        UniqueConstraint("purchase_id", "ingredient_id"),
        CheckConstraint("quantity > 0 AND unit_cost >= 0", name="quantity_cost_valid"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"), index=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4))


class Order(Timestamp, Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "total >= 0 AND estimated_cost >= 0", name="totals_nonnegative"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    stock_consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    tracking_hash: Mapped[str] = mapped_column(String(64), unique=True)
    request_key: Mapped[str] = mapped_column(String(80), unique=True)


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint(
            "quantity > 0 AND unit_price >= 0", name="quantity_price_valid"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(150))
    quantity: Mapped[int]
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)
    ingredients_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)


class Payment(Timestamp, Base):
    __tablename__ = "payments"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(String(30))
    reference: Mapped[str] = mapped_column(String(150), default="")
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))


class InventoryMovement(Timestamp, Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        UniqueConstraint("source_key", "ingredient_id"),
        CheckConstraint("quantity != 0", name="quantity_nonzero"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    kind: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str] = mapped_column(String(250))
    source_key: Mapped[str] = mapped_column(String(100), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))


class ProductionTask(Timestamp, Base):
    __tablename__ = "production_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    due_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str] = mapped_column(Text, default="")


class QuoteRequest(Timestamp, Base):
    __tablename__ = "quote_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30))
    theme: Mapped[str] = mapped_column(String(150))
    portions: Mapped[int]
    flavor: Mapped[str] = mapped_column(String(100))
    filling: Mapped[str] = mapped_column(String(100), default="Por coordinar")
    decoration: Mapped[str] = mapped_column(String(500), default="")
    due_date: Mapped[date] = mapped_column(Date)
    reference_image: Mapped[str | None] = mapped_column(String(500))
    reference_work_id: Mapped[int | None] = mapped_column(ForeignKey("works.id"))
    reference_work: Mapped[dict | None] = mapped_column(JSON)
    celebration: Mapped[str] = mapped_column(String(100), default="", server_default="")
    preferred_colors: Mapped[str] = mapped_column(
        String(150), default="", server_default=""
    )
    cake_message: Mapped[str] = mapped_column(
        String(150), default="", server_default=""
    )
    comments: Mapped[str] = mapped_column(Text, default="", server_default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    quoted_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    staff_notes: Mapped[str] = mapped_column(Text, default="")
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), unique=True)
    request_key: Mapped[str] = mapped_column(String(80), unique=True)


class AuditLog(Timestamp, Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(60))
    entity: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[int]
    details: Mapped[str] = mapped_column(Text, default="")


class BusinessSetting(Base):
    __tablename__ = "business_settings"
    __table_args__ = (
        CheckConstraint(
            "(snack_min_per_guest IS NULL AND snack_max_per_guest IS NULL) OR (snack_min_per_guest IS NOT NULL AND snack_max_per_guest IS NOT NULL AND snack_min_per_guest > 0 AND snack_max_per_guest >= snack_min_per_guest)",
            name="snack_guest_range_valid",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="DelyJhos")
    whatsapp_number: Mapped[str] = mapped_column(String(20), default="")
    contact_email: Mapped[str | None] = mapped_column(String(254))
    pickup_instructions: Mapped[str] = mapped_column(
        String(1000), default="Coordinar la entrega al confirmar el pedido."
    )
    demo_catalog: Mapped[bool] = mapped_column(Boolean, default=True)
    snack_min_per_guest: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    snack_max_per_guest: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
