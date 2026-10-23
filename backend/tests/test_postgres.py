import os
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, text, select, func
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from app.base import Base
from app.models import (
    Role,
    User,
    Category,
    Product,
    Customer,
    Ingredient,
    Recipe,
    RecipeIngredient,
    InventoryMovement,
    Order,
)
from app.schemas.business import OrderWrite
from app.services import create_order, transition_order


@pytest.mark.skipif(
    not os.environ.get("TEST_POSTGRES_URL"),
    reason="Set TEST_POSTGRES_URL to test PostgreSQL locking in an isolated disposable schema",
)
def test_postgresql_concurrent_production_consumes_once():
    url = make_url(os.environ["TEST_POSTGRES_URL"])
    if url.host and "-pooler." in url.host:
        url = url.set(host=url.host.replace("-pooler.", "."))
    schema = "delyjhos_test_" + uuid4().hex
    root = create_engine(url)
    with root.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    try:
        from pathlib import Path
        from alembic.config import Config
        from alembic import command

        backend_dir = Path(__file__).resolve().parents[1]
        config = Config(str(backend_dir / "alembic.ini"))
        config.set_main_option("script_location", str(backend_dir / "migrations"))
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        with Session(engine) as db:
            role = Role(name="admin")
            db.add(role)
            db.flush()
            actor = User(
                name="Test",
                email="test@example.com",
                password_hash="not-used",
                role_id=role.id,
            )
            db.add(actor)
            category = Category(name="Test", slug="test")
            db.add(category)
            customer = Customer(name="Test", phone="999999999")
            db.add(customer)
            ingredient = Ingredient(
                name="Test", unit="kg", stock=10, minimum_stock=1, unit_cost=5
            )
            db.add(ingredient)
            db.flush()
            product = Product(
                name="Test",
                slug="test",
                category_id=category.id,
                price=100,
                description="Test",
            )
            db.add(product)
            db.flush()
            recipe = Recipe(
                product_id=product.id,
                name="Test",
                yield_quantity=1,
                labor_cost=0,
                overhead_cost=0,
            )
            db.add(recipe)
            db.flush()
            db.add(
                RecipeIngredient(
                    recipe_id=recipe.id, ingredient_id=ingredient.id, quantity=2
                )
            )
            db.flush()
            order, _ = create_order(
                db,
                OrderWrite(
                    customer_id=customer.id,
                    due_date=date.today() + timedelta(days=1),
                    items=[{"product_id": product.id, "quantity": 1}],
                    request_key=str(uuid4()),
                ),
            )
            transition_order(db, order.id, "confirmed", actor)
            order_id, actor_id, ingredient_id = order.id, actor.id, ingredient.id
            db.commit()

        def produce(_):
            with Session(engine) as db:
                transition_order(db, order_id, "production", db.get(User, actor_id))
                db.commit()

        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(produce, range(2)))
        with Session(engine) as db:
            assert db.get(Ingredient, ingredient_id).stock == Decimal(8)
            assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 1
            assert db.get(Order, order_id).stock_consumed is True
    finally:
        engine.dispose()
        with root.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        root.dispose()
