from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator

Money = Annotated[Decimal, Field(ge=0, le=1000000, max_digits=14, decimal_places=2)]
Quantity = Annotated[Decimal, Field(gt=0, le=1000000, max_digits=12, decimal_places=3)]
Name = Annotated[str, Field(min_length=1, max_length=120)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserWrite(Input):
    name: Name
    email: EmailStr
    role: Literal["admin", "manager", "sales", "production"]
    password: str = Field(min_length=12, max_length=128)


class UserUpdate(Input):
    name: Name
    role: Literal["admin", "manager", "sales", "production"]
    is_active: bool
    password: str | None = Field(default=None, min_length=12, max_length=128)


class CategoryWrite(Input):
    name: Name
    slug: str = Field(
        min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


class ProductWrite(Input):
    category_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(
        min_length=1, max_length=170, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    description: str = Field(default="", max_length=5000)
    price: Money
    is_active: bool = True
    is_featured: bool = False
    image_url: str | None = Field(default=None, max_length=500)

    @field_validator("image_url")
    @classmethod
    def safe_url(cls, value):
        if value and not (
            value.startswith("/uploads/") or value.startswith("https://")
        ):
            raise ValueError("Usa una imagen cargada o una URL HTTPS")
        return value


class CustomerWrite(Input):
    name: Name
    phone: str = Field(min_length=6, max_length=30)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)


class SupplierWrite(Input):
    name: Name
    phone: str = Field(default="", max_length=30)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)


class IngredientWrite(Input):
    name: Name
    unit: Literal["kg", "g", "l", "ml", "unidad"]
    minimum_stock: Annotated[Decimal, Field(ge=0, le=1000000, decimal_places=3)] = (
        Decimal(0)
    )
    unit_cost: Annotated[Decimal, Field(ge=0, le=1000000, decimal_places=4)] = Decimal(
        0
    )


class RecipeLine(Input):
    ingredient_id: int = Field(gt=0)
    quantity: Quantity


class RecipeWrite(Input):
    product_id: int = Field(gt=0)
    name: Name
    yield_quantity: Quantity = Decimal(1)
    labor_cost: Money = Decimal(0)
    overhead_cost: Money = Decimal(0)
    instructions: str = Field(default="", max_length=10000)
    items: list[RecipeLine] = Field(min_length=1, max_length=100)


class PurchaseLine(Input):
    ingredient_id: int = Field(gt=0)
    quantity: Quantity
    unit_cost: Annotated[Decimal, Field(ge=0, le=1000000, decimal_places=4)]


class PurchaseWrite(Input):
    supplier_id: int = Field(gt=0)
    reference: str = Field(default="", max_length=100)
    items: list[PurchaseLine] = Field(min_length=1, max_length=100)


class OrderLine(Input):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1000)


class OrderWrite(Input):
    customer_id: int = Field(gt=0)
    due_date: date
    notes: str = Field(default="", max_length=3000)
    items: list[OrderLine] = Field(min_length=1, max_length=50)
    request_key: str = Field(min_length=16, max_length=80)


class PublicOrder(Input):
    customer: CustomerWrite
    due_date: date
    notes: str = Field(default="", max_length=3000)
    items: list[OrderLine] = Field(min_length=1, max_length=50)
    request_key: str = Field(min_length=16, max_length=80)


class StatusWrite(Input):
    status: Literal["confirmed", "production", "ready", "delivered", "cancelled"]


class PaymentWrite(Input):
    amount: Annotated[Decimal, Field(gt=0, le=1000000, decimal_places=2)]
    method: Literal["cash", "transfer", "yape", "plin", "card"]
    reference: str = Field(default="", max_length=150)
    idempotency_key: str = Field(min_length=16, max_length=80)


class Adjustment(Input):
    ingredient_id: int = Field(gt=0)
    quantity: Annotated[Decimal, Field(ge=-1000000, le=1000000, decimal_places=3)]
    reason: str = Field(min_length=5, max_length=250)
    idempotency_key: str = Field(min_length=16, max_length=80)

    @field_validator("quantity")
    @classmethod
    def nonzero(cls, v):
        if not v:
            raise ValueError("La cantidad no puede ser cero")
        return v


class TaskWrite(Input):
    order_id: int = Field(gt=0)
    title: Name
    due_date: date
    assigned_to: int | None = Field(default=None, gt=0)
    status: Literal["pending", "in_progress", "done"] = "pending"
    notes: str = Field(default="", max_length=2000)


class QuoteWrite(Input):
    name: Name
    phone: str = Field(min_length=6, max_length=30)
    theme: str = Field(min_length=1, max_length=150)
    portions: int = Field(ge=1, le=1000)
    flavor: str = Field(min_length=1, max_length=100)
    filling: str = Field(default="Por coordinar", max_length=100)
    decoration: str = Field(default="", max_length=500)
    due_date: date
    reference_image: str | None = Field(default=None, max_length=500)
    request_key: str = Field(min_length=16, max_length=80)

    @field_validator("reference_image")
    @classmethod
    def local_image(cls, v):
        if v and not v.startswith("/uploads/"):
            raise ValueError("Carga primero la imagen")
        return v


class QuoteUpdate(Input):
    status: Literal["pending", "contacted", "quoted", "accepted", "rejected"]
    quoted_price: Money | None = None
    staff_notes: str = Field(default="", max_length=3000)


class Estimate(Input):
    product_id: int = Field(gt=0)
    quantity: Quantity = Decimal(1)
    decoration_cost: Money = Decimal(0)
    margin: Annotated[Decimal, Field(ge=0, le=90)] = Decimal(30)


class BusinessWrite(Input):
    name: Name = "DelyJhos"
    whatsapp_number: str = Field(default="", max_length=20, pattern=r"^\d{8,15}$|^$")
    contact_email: EmailStr | None = None
    pickup_instructions: str = Field(default="", max_length=1000)
    demo_catalog: bool = True


class ConvertQuote(Input):
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=1)


class ProductImageWrite(Input):
    product_id: int = Field(gt=0)
    url: str = Field(min_length=1, max_length=500)
    alt: str = Field(default="", max_length=200)

    @field_validator("url")
    @classmethod
    def safe_url(cls, v):
        if not (v.startswith("/uploads/") or v.startswith("https://")):
            raise ValueError("Usa una imagen cargada o HTTPS")
        return v


class TrackingInput(Input):
    token: str = Field(min_length=20, max_length=100)
