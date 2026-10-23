from datetime import date
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Numeric,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    JSON,
    Date,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.base import Base
from app.models.business import Timestamp


class Snack(Timestamp, Base):
    __tablename__ = "snacks"
    __table_args__ = (
        CheckConstraint("kind IN ('sweet', 'savory')", name="kind_valid"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    kind: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str | None] = mapped_column(String(500))
    source_page: Mapped[int | None]
    source_document: Mapped[str] = mapped_column(String(200), default="")
    is_available: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)


class SnackPresentation(Base):
    __tablename__ = "snack_presentations"
    __table_args__ = (
        UniqueConstraint("snack_id", "units"),
        CheckConstraint("units IN (25, 50, 100)", name="units_valid"),
        CheckConstraint(
            "historical_price >= 0 AND (current_price IS NULL OR current_price > 0)",
            name="prices_valid",
        ),
        CheckConstraint(
            "NOT price_confirmed OR current_price IS NOT NULL",
            name="confirmed_price_required",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    snack_id: Mapped[int] = mapped_column(ForeignKey("snacks.id"), index=True)
    units: Mapped[int]
    historical_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    source_year: Mapped[int] = mapped_column(default=2025)
    current_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    price_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    production_product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))


class SnackQuote(Timestamp, Base):
    __tablename__ = "snack_quotes"
    __table_args__ = (UniqueConstraint("request_key"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30))
    celebration: Mapped[str] = mapped_column(String(150))
    due_date: Mapped[date] = mapped_column(Date)
    guests: Mapped[int]
    comments: Mapped[str] = mapped_column(Text, default="")
    items: Mapped[list] = mapped_column(JSON)
    request_key: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    staff_notes: Mapped[str] = mapped_column(Text, default="")
    quoted_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), unique=True)
    reviewed_items: Mapped[list | None] = mapped_column(JSON)
    tracking_hash: Mapped[str | None] = mapped_column(String(64), unique=True)


class SnackPackage(Timestamp, Base):
    __tablename__ = "snack_packages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    items: Mapped[list] = mapped_column(JSON)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
