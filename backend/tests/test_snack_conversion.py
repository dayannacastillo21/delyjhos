from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models import Order, Customer, Ingredient, OrderItem, ProductionTask
from app.models.snacks import SnackQuote
from tests.test_snacks import seed, proposal


def prepare(client, engine, status="accepted"):
    seed(engine, publish=True)
    response = client.post("/api/v1/snack-quotes", json=proposal())
    assert response.status_code == 201
    id = response.json()["id"]
    assert (
        client.put(
            f"/api/v1/admin/snack-quotes/{id}",
            json={
                "status": status,
                "quoted_price": "80.00",
                "staff_notes": "Cliente acepta dos paquetes",
            },
        ).status_code
        == 200
    )
    return id


def payload():
    return {
        "availability_confirmed": True,
        "items": [
            {"presentation_id": 1, "product_id": 1, "packs": 2, "unit_price": "40.00"}
        ],
    }


def test_accepted_table_becomes_order_and_consumes_recipe_per_pack_once(setup):
    client, engine = setup
    id = prepare(client, engine)
    result = client.post(f"/api/v1/admin/snack-quotes/{id}/convert", json=payload())
    assert result.status_code == 201, result.text
    order_id = result.json()["id"]
    assert result.json()["total"] == "80.00"
    with Session(engine) as db:
        quote = db.get(SnackQuote, id)
        assert quote.order_id == order_id
        assert quote.items[0]["price"] is None
        assert quote.reviewed_items[0]["price"] == "40.00"
        assert quote.reviewed_items[0]["units"] == 25
        item = db.scalar(select(OrderItem).where(OrderItem.order_id == order_id))
        assert item.quantity == 2  # Two presentations, not fifty presentations.
        assert item.unit_price == Decimal("40.00")
        assert "25 unidades" in item.product_name
        assert db.get(Ingredient, 1).stock == Decimal("10")
        assert db.scalar(select(func.count()).select_from(ProductionTask)) == 1
    assert (
        client.post(
            f"/api/v1/admin/snack-quotes/{id}/convert", json=payload()
        ).status_code
        == 409
    )
    assert (
        client.put(
            f"/api/v1/admin/snack-quotes/{id}",
            json={"status": "rejected", "staff_notes": "", "quoted_price": None},
        ).status_code
        == 409
    )
    for status in ["confirmed", "production", "production", "ready"]:
        response = client.post(
            f"/api/v1/admin/orders/{order_id}/status", json={"status": status}
        )
        assert response.status_code == 200, response.text
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal("6")
        assert db.scalar(select(ProductionTask)).status == "done"
    assert (
        client.post(
            f"/api/v1/admin/orders/{order_id}/status", json={"status": "delivered"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/admin/orders/{order_id}/payments",
            json={
                "amount": "80.00",
                "method": "cash",
                "reference": "",
                "idempotency_key": "snack-payment-test-key-12345",
            },
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/v1/admin/orders/{order_id}/status", json={"status": "delivered"}
        ).status_code
        == 200
    )
    tracked = client.post(
        "/api/v1/tracking", json={"token": result.json()["tracking_token"]}
    )
    assert tracked.json()["status"] == "delivered"


def test_conversion_requires_acceptance_exact_total_all_lines_and_confirmation(setup):
    client, engine = setup
    id = prepare(client, engine, status="quoted")
    path = f"/api/v1/admin/snack-quotes/{id}/convert"
    assert client.post(path, json=payload()).status_code == 409
    client.put(
        f"/api/v1/admin/snack-quotes/{id}",
        json={"status": "accepted", "quoted_price": "80.00", "staff_notes": ""},
    )
    data = payload()
    data["items"][0]["unit_price"] = "39.99"
    assert client.post(path, json=data).status_code == 409
    data = payload()
    data["items"][0]["presentation_id"] = 2
    assert client.post(path, json=data).status_code == 422
    data = payload()
    data["availability_confirmed"] = False
    assert client.post(path, json=data).status_code == 422
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Order)) == 0
        assert db.scalar(select(func.count()).select_from(Customer)) == 1
        assert db.get(SnackQuote, id).order_id is None


def test_conversion_requires_role_and_recipe_without_partial_customer(setup):
    client, engine = setup
    id = prepare(client, engine)
    data = payload()
    data["items"][0]["product_id"] = 9999
    assert (
        client.post(f"/api/v1/admin/snack-quotes/{id}/convert", json=data).status_code
        == 409
    )
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Customer)) == 1
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "production@example.com", "password": "A-test-password-123"},
    )
    client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
    assert (
        client.post(
            f"/api/v1/admin/snack-quotes/{id}/convert", json=payload()
        ).status_code
        == 403
    )
