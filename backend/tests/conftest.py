import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.base import Base
from app.main import app
from app.dependencies import get_db
from app.models import (
    Role,
    User,
    Category,
    Ingredient,
    Customer,
    Product,
    Recipe,
    RecipeIngredient,
    Supplier,
)
from app.security import password_hash


@pytest.fixture
def setup():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def fk(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)

    def db_override():
        with Session(engine, expire_on_commit=False) as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = db_override
    with Session(engine) as db:
        for role in ["admin", "manager", "sales", "production"]:
            db.add(Role(name=role))
        db.flush()
        db.add(
            User(
                name="Admin",
                email="admin@example.com",
                role_id=1,
                password_hash=password_hash.hash("A-test-password-123"),
            )
        )
        db.add(
            User(
                name="Production",
                email="production@example.com",
                role_id=4,
                password_hash=password_hash.hash("A-test-password-123"),
            )
        )
        db.add(Category(name="Tortas", slug="tortas"))
        db.add(
            Ingredient(name="Harina", unit="kg", stock=10, unit_cost=5, minimum_stock=2)
        )
        db.add(Customer(name="Cliente", phone="999999999"))
        db.add(Supplier(name="Proveedor", phone="999999999"))
        db.flush()
        db.add(
            Product(
                name="Torta",
                slug="torta",
                category_id=1,
                price=100,
                description="Prueba",
                is_active=True,
            )
        )
        db.flush()
        db.add(
            Recipe(
                product_id=1,
                name="Torta",
                yield_quantity=1,
                labor_cost=20,
                overhead_cost=5,
            )
        )
        db.flush()
        db.add(RecipeIngredient(recipe_id=1, ingredient_id=1, quantity=2))
        db.commit()
    client = TestClient(app)
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "A-test-password-123"},
    )
    assert login.status_code == 200, login.text
    client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
    yield client, engine
    app.dependency_overrides.clear()
    engine.dispose()
