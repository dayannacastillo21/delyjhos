import re
from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import Field, model_validator, field_validator
from app.schemas.business import Input


class SnackWrite(Input):
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9-]+$")
    kind: Literal["sweet", "savory"]
    description: str = Field(default="", max_length=3000)
    image_url: str | None = Field(default=None, max_length=500)
    source_page: int | None = Field(default=None, ge=1, le=10000)
    source_document: str = Field(default="", max_length=200)
    is_available: bool = False
    is_published: bool = False

    @field_validator("image_url")
    @classmethod
    def local_image(cls, value):
        if value and (".." in value or not (value.startswith("/uploads/") or re.fullmatch(r"/media/snacks/[a-z0-9-]+\.webp", value))):
            raise ValueError("Carga una fotografía o selecciona una imagen del catálogo")
        return value


class PresentationWrite(Input):
    snack_id: int = Field(gt=0)
    units: Literal[25, 50, 100]
    historical_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    source_year: int = Field(default=2025, ge=2000, le=2100)
    current_price: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    price_confirmed: bool = False
    production_product_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def confirmed_price(self):
        if self.price_confirmed and self.current_price is None:
            raise ValueError("Ingresa el precio actual antes de confirmarlo")
        return self


class SnackLine(Input):
    presentation_id: int = Field(gt=0)
    packs: int = Field(ge=1, le=100)


class SnackQuoteWrite(Input):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=6, max_length=30)
    celebration: str = Field(min_length=1, max_length=150)
    due_date: date
    guests: int = Field(ge=1, le=10000)
    comments: str = Field(default="", max_length=3000)
    items: list[SnackLine] = Field(min_length=1, max_length=93)
    request_key: str = Field(min_length=16, max_length=80)

    @model_validator(mode="after")
    def unique_lines(self):
        if len({x.presentation_id for x in self.items}) != len(self.items):
            raise ValueError("Agrupa las presentaciones repetidas")
        return self


class PackageWrite(Input):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1500)
    is_published: bool = False
    items: list[SnackLine] = Field(min_length=1, max_length=93)

    @model_validator(mode="after")
    def no_duplicates(self):
        ids = [x.presentation_id for x in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Agrupa las presentaciones repetidas")
        return self


class SnackQuoteUpdate(Input):
    status: Literal["pending", "contacted", "quoted", "accepted", "rejected"]
    staff_notes: str = Field(default="", max_length=3000)
    quoted_price: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )

    @model_validator(mode="after")
    def reviewed_price(self):
        if self.status in {"quoted", "accepted"} and self.quoted_price is None:
            raise ValueError("La cotización necesita un precio revisado")
        return self


class ReviewedSnackLine(Input):
    presentation_id: int = Field(gt=0)
    product_id: int = Field(gt=0)
    packs: int = Field(ge=1, le=100)
    unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class ConvertSnackQuote(Input):
    availability_confirmed: Literal[True]
    items: list[ReviewedSnackLine] = Field(min_length=1, max_length=93)

    @model_validator(mode="after")
    def unique_items(self):
        ids = [x.presentation_id for x in self.items]
        products = [x.product_id for x in self.items]
        if len(ids) != len(set(ids)) or len(products) != len(set(products)):
            raise ValueError(
                "Cada presentación necesita una línea y un producto de producción distinto"
            )
        return self


class CatalogPrice(Input):
    id: int = Field(gt=0)
    current_price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    price_confirmed: bool = False

    @model_validator(mode="after")
    def confirmed_price(self):
        if self.price_confirmed and self.current_price is None:
            raise ValueError("Indica un precio antes de confirmarlo")
        return self


class SnackCatalogWrite(SnackWrite):
    presentations: list[CatalogPrice] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def unique_presentations(self):
        if len({p.id for p in self.presentations}) != len(self.presentations):
            raise ValueError("No repitas una presentación")
        return self
