from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from app.models import BusinessSetting, RecipeIngredient, Product
from app.models.snacks import Snack, SnackPresentation


def report(client):
    response = client.get("/api/v1/business/readiness")
    assert response.status_code == 200
    data = response.json()
    return data, {item["key"]: item for item in data["checks"]}


def test_readiness_is_private_and_role_restricted(setup):
    client, _ = setup
    token = client.headers.pop("Authorization")
    assert client.get("/api/v1/business/readiness").status_code == 401
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "production@example.com", "password": "A-test-password-123"},
    )
    client.headers["Authorization"] = "Bearer " + response.json()["access_token"]
    assert client.get("/api/v1/business/readiness").status_code == 403
    client.headers["Authorization"] = token
    assert client.get("/api/v1/business/readiness").status_code == 200


def test_readiness_tracks_real_configuration_without_writing(setup):
    client, engine = setup
    initial, checks = report(client)
    assert checks["recipes"]["passed"]
    assert not checks["contact"]["passed"]
    assert not checks["catalog"]["passed"]
    assert not checks["snack_prices"]["passed"]
    with Session(engine) as db:
        assert db.get(BusinessSetting, 1) is None
        db.add(BusinessSetting(id=1, demo_catalog=False, whatsapp_number="51999999999"))
        snack = Snack(
            name="Empanaditas", slug="empanaditas", kind="savory", is_published=True
        )
        db.add(snack)
        db.flush()
        for units in (25, 50, 100):
            db.add(
                SnackPresentation(
                    snack_id=snack.id,
                    units=units,
                    historical_price=25,
                    current_price=30,
                    price_confirmed=True,
                    production_product_id=1,
                )
            )
        db.commit()
    data, checks = report(client)
    assert data["passed"] == data["total"] == 5
    assert data["manual_checks"] == initial["manual_checks"]
    assert "database_url" not in str(data)
    with Session(engine) as db:
        db.get(Product, 1).is_active = False
        db.commit()
    _, checks = report(client)
    assert not checks["snack_production"]["passed"]


def test_empty_recipes_and_missing_presentations_are_not_ready(setup):
    client, engine = setup
    with Session(engine) as db:
        db.execute(delete(RecipeIngredient))
        snack = Snack(
            name="Alfajores", slug="alfajores", kind="sweet", is_published=True
        )
        db.add(snack)
        db.flush()
        db.add(
            SnackPresentation(
                snack_id=snack.id,
                units=25,
                historical_price=10,
                current_price=None,
                price_confirmed=False,
            )
        )
        db.commit()
    _, checks = report(client)
    assert not checks["recipes"]["passed"]
    assert not checks["snack_prices"]["passed"]
    assert not checks["snack_production"]["passed"]
