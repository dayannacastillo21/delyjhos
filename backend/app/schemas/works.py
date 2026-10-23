from pathlib import PurePosixPath
from decimal import Decimal
from pydantic import Field, field_validator
from app.schemas.business import Input


def media_path(value):
    if (
        not value.startswith(("/media/works/", "/uploads/"))
        or ".." in PurePosixPath(value).parts
        or any(x in value for x in ["?", "#", "\\"])
    ):
        raise ValueError("Usa un archivo del sitio o una carga verificada")
    return value


class WorkWrite(Input):
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9-]+$")
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=3000)
    occasion: str = Field(default="", max_length=100)
    video_url: str = Field(min_length=1, max_length=500)
    poster_url: str = Field(min_length=1, max_length=500)
    gallery: list[str] = Field(default_factory=list, max_length=12)
    width: int = Field(default=576, ge=1, le=7680)
    height: int = Field(default=1024, ge=1, le=7680)
    duration: Decimal = Field(gt=0, le=3600, max_digits=8, decimal_places=2)
    product_id: int | None = Field(default=None, gt=0)
    is_published: bool = False

    @field_validator("video_url")
    @classmethod
    def video(cls, value):
        media_path(value)
        if not value.lower().endswith(".mp4"):
            raise ValueError("Usa video MP4 compatible con la web")
        return value

    @field_validator("poster_url")
    @classmethod
    def image(cls, value):
        media_path(value)
        if not value.lower().endswith((".webp", ".jpg", ".jpeg", ".png")):
            raise ValueError("Usa una fotografía JPG, PNG o WebP")
        return value

    @field_validator("gallery")
    @classmethod
    def images(cls, values):
        return [cls.image(value) for value in values]
