"""Disposable local database used only by Playwright. Never connects to Neon."""

import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///" + str(
    Path(__file__).resolve().parents[1] / "e2e-test.db"
).replace("\\", "/")
os.environ["CORS_ORIGINS"] = "http://localhost:5174"
from app.base import Base
from app.database import engine, SessionLocal
from app.models import (
    Role,
    User,
    Category,
    Product,
    Customer,
    Ingredient,
    Recipe,
    RecipeIngredient,
    Supplier,
)
from app.security import password_hash
from app.main import app

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
with SessionLocal.begin() as db:
    for name in ["admin", "manager", "sales", "production"]:
        db.add(Role(name=name))
    db.flush()
    db.add(
        User(
            name="Administración de prueba",
            email="admin@example.com",
            role_id=1,
            password_hash=password_hash.hash("E2E-only-password-123"),
        )
    )
    db.add(Category(name="Tortas temáticas", slug="tortas-tematicas"))
    db.add(Customer(name="Cliente de prueba", phone="999999999"))
    db.add(Supplier(name="Proveedor de prueba", phone="999999999"))
    db.add(Ingredient(name="Harina", unit="kg", stock=30, minimum_stock=2, unit_cost=5))
    db.flush()
    db.add(
        Product(
            name="Torta de Chocolate",
            slug="torta-chocolate",
            category_id=1,
            description="Producto de prueba",
            price=95,
            is_featured=True,
        )
    )
    db.flush()
    db.add(
        Recipe(
            name="Receta de prueba",
            product_id=1,
            yield_quantity=1,
            labor_cost=20,
            overhead_cost=5,
        )
    )
    db.flush()
    db.add(RecipeIngredient(recipe_id=1, ingredient_id=1, quantity=2))
