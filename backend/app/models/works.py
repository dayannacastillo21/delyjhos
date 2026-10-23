from sqlalchemy import String, Text, Boolean, ForeignKey, JSON, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.base import Base
from app.models.business import Timestamp


class Work(Timestamp, Base):
    __tablename__ = "works"
    __table_args__ = (
        CheckConstraint(
            "width > 0 AND height > 0 AND duration > 0", name="media_dimensions_valid"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    occasion: Mapped[str] = mapped_column(String(100), default="")
    video_url: Mapped[str] = mapped_column(String(500))
    poster_url: Mapped[str] = mapped_column(String(500))
    gallery: Mapped[list] = mapped_column(JSON, default=list)
    width: Mapped[int] = mapped_column(default=576)
    height: Mapped[int] = mapped_column(default=1024)
    duration: Mapped[float] = mapped_column(Numeric(8, 2))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
