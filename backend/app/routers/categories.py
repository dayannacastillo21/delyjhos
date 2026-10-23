from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.category import Category
from app.schemas.category import CategoryRead

router = APIRouter(
    prefix="/api/v1/categories",
    tags=["Categorías"],
)


@router.get("/", response_model=list[CategoryRead])
def list_categories(
    db: Annotated[Session, Depends(get_db)],
) -> list[Category]:
    statement = (
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name, Category.id)
    )

    return list(db.scalars(statement).all())