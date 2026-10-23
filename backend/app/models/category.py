from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.base import Base


class Category(Base):
    __tablename__ = "categories"

    __table_args__ = (
        CheckConstraint(
            "length(trim(name)) > 0",
            name="name_not_blank",
        ),
        CheckConstraint(
            "length(trim(slug)) > 0",
            name="slug_not_blank",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )

    slug: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        unique=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=true(),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )