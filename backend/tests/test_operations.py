from datetime import date, timedelta
from uuid import uuid4
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models import Ingredient, InventoryMovement, Order, Customer


def make_order(client, quantity=2):
    response = client.post(
        "/api/v1/admin/orders",
        json={
            "customer_id": 1,
            "due_date": str(date.today() + timedelta(days=1)),
            "items": [{"product_id": 1, "quantity": quantity}],
            "request_key": str(uuid4()),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_catalog_and_permissions(setup):
    c, _ = setup
    assert len(c.get("/api/v1/products/").json()) == 1
    assert c.get("/api/v1/products/?q=otra").json() == []
    c.headers.pop("Authorization")
    assert c.get("/api/v1/admin/orders").status_code == 401
    assert c.post("/api/v1/admin/products", json={}).status_code == 401
    assert (
        c.post(
            "/api/v1/auth/login", json={"email": "admin@example.com", "password": "bad"}
        ).status_code
        == 401
    )


def test_order_stock_and_payment_idempotency(setup):
    c, engine = setup
    order = make_order(c)
    id = order["id"]
    assert order["total"] == "200.00"
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "delivered"}
        ).status_code
        == 409
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "confirmed"}
        ).status_code
        == 200
    )
    for _ in range(2):
        r = c.post(f"/api/v1/admin/orders/{id}/status", json={"status": "production"})
        assert r.status_code == 200, r.text
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal(6)
        assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 1
    data = {"amount": "50", "method": "cash", "idempotency_key": str(uuid4())}
    for _ in range(2):
        assert (
            c.post(f"/api/v1/admin/orders/{id}/payments", json=data).status_code == 201
        )
    assert c.get(f"/api/v1/admin/orders/{id}").json()["balance"] == "150.00"
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/payments", json={**data, "amount": "51"}
        ).status_code
        == 409
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "ready"}
        ).status_code
        == 200
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "delivered"}
        ).status_code
        == 409
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/payments",
            json={**data, "amount": "150", "idempotency_key": str(uuid4())},
        ).status_code
        == 201
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "delivered"}
        ).status_code
        == 200
    )
    report = c.get("/api/v1/reports/dashboard").json()
    assert report["sales_total"] == "200.00"
    assert report["estimated_profit"] == "130.00"


def test_stock_failure_rolls_back(setup):
    c, engine = setup
    order = make_order(c, 10)
    id = order["id"]
    c.post(f"/api/v1/admin/orders/{id}/status", json={"status": "confirmed"})
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "production"}
        ).status_code
        == 409
    )
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal(10)
        assert db.get(Order, id).status == "confirmed"
        assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 0


def test_purchase_receive_and_adjustment(setup):
    c, engine = setup
    purchase = c.post(
        "/api/v1/admin/purchases",
        json={
            "supplier_id": 1,
            "items": [{"ingredient_id": 1, "quantity": "5", "unit_cost": "8"}],
        },
    )
    assert purchase.status_code == 201, purchase.text
    for _ in range(2):
        assert (
            c.post(
                f"/api/v1/admin/purchases/{purchase.json()['id']}/receive"
            ).status_code
            == 200
        )
    payload = {
        "ingredient_id": 1,
        "quantity": "-1",
        "reason": "Merma registrada",
        "idempotency_key": str(uuid4()),
    }
    for _ in range(2):
        assert c.post("/api/v1/admin/inventory/adjust", json=payload).status_code == 201
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal(14)
        assert db.get(Ingredient, 1).unit_cost == Decimal(6)
        assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 2
    assert (
        c.put(
            "/api/v1/admin/ingredients/1", json={"name": "Harina", "unit": "g"}
        ).status_code
        == 409
    )


def test_recipe_snapshot_is_immutable(setup):
    c, engine = setup
    order = make_order(c, 1)
    id = order["id"]
    c.post(f"/api/v1/admin/orders/{id}/status", json={"status": "confirmed"})
    assert (
        c.put(
            "/api/v1/admin/recipes/1",
            json={
                "product_id": 1,
                "name": "Nueva",
                "yield_quantity": "1",
                "items": [{"ingredient_id": 1, "quantity": "9"}],
            },
        ).status_code
        == 200
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "production"}
        ).status_code
        == 200
    )
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal(8)


def test_public_order_tracking_and_duplicates(setup):
    c, engine = setup
    data = {
        "customer": {"name": "Público", "phone": "999999999"},
        "due_date": str(date.today() + timedelta(days=1)),
        "items": [{"product_id": 1, "quantity": 1}],
        "request_key": str(uuid4()),
    }
    r = c.post("/api/v1/orders/", json=data)
    assert r.status_code == 201, r.text
    token = r.json()["tracking_token"]
    result = c.post("/api/v1/tracking", json={"token": token}).json()
    assert set(result) == {"id", "status", "due_date"}
    assert c.post("/api/v1/orders/", json=data).status_code == 409
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Customer)) == 2
    assert c.post("/api/v1/tracking", json={"token": "x" * 30}).status_code == 404
    assert (
        c.post(
            "/api/v1/orders/", json={**data, "request_key": str(uuid4()), "total": 1}
        ).status_code
        == 422
    )


def test_production_role_and_logout(setup):
    c, _ = setup
    r = c.post(
        "/api/v1/auth/login",
        json={"email": "production@example.com", "password": "A-test-password-123"},
    )
    c.headers["Authorization"] = "Bearer " + r.json()["access_token"]
    assert c.get("/api/v1/admin/users").status_code == 403
    assert (
        c.post(
            "/api/v1/admin/inventory/adjust",
            json={
                "ingredient_id": 1,
                "quantity": "10",
                "reason": "No permitido",
                "idempotency_key": str(uuid4()),
            },
        ).status_code
        == 403
    )
    assert "sales_total" not in c.get("/api/v1/reports/dashboard").json()
    assert c.post("/api/v1/auth/logout").status_code == 200
    assert c.get("/api/v1/auth/me").status_code == 401


def test_estimate_and_quote(setup):
    c, _ = setup
    response = c.post(
        "/api/v1/tools/estimate",
        json={"product_id": 1, "quantity": "2", "margin": "30", "decoration_cost": "0"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["suggested_price"] == "100.00"
    quote = {
        "name": "Cliente",
        "phone": "999999999",
        "theme": "Flores",
        "portions": 20,
        "flavor": "Vainilla",
        "due_date": str(date.today() + timedelta(days=1)),
        "request_key": str(uuid4()),
    }
    assert c.post("/api/v1/quotes/", json=quote).status_code == 201
    assert c.post("/api/v1/quotes/", json=quote).status_code == 409
    assert (
        c.post(
            "/api/v1/uploads", files={"file": ("bad.png", b"not an image", "image/png")}
        ).status_code
        == 422
    )


def test_login_rate_limit_and_validation(setup):
    c, _ = setup
    for _ in range(5):
        assert (
            c.post(
                "/api/v1/auth/login",
                json={"email": "wrong@example.com", "password": "bad"},
            ).status_code
            == 401
        )
    assert (
        c.post(
            "/api/v1/auth/login", json={"email": "wrong@example.com", "password": "bad"}
        ).status_code
        == 429
    )
    assert (
        c.post("/api/v1/admin/ingredients", json={"name": "", "unit": "kg"}).status_code
        == 422
    )


def test_quote_conversion_and_settings(setup):
    c, _ = setup
    assert (
        c.put(
            "/api/v1/business/settings",
            json={
                "name": "DelyJhos",
                "whatsapp_number": "51999999999",
                "demo_catalog": False,
            },
        ).status_code
        == 200
    )
    assert c.get("/api/v1/settings").json()["whatsapp_number"] == "51999999999"
    quote = {
        "name": "Cliente",
        "phone": "999999999",
        "theme": "Flores",
        "portions": 20,
        "flavor": "Vainilla",
        "due_date": str(date.today() + timedelta(days=1)),
        "request_key": str(uuid4()),
    }
    id = c.post("/api/v1/quotes/", json=quote).json()["id"]
    assert (
        c.post(
            f"/api/v1/admin/quotes/{id}/convert", json={"product_id": 1, "quantity": 1}
        ).status_code
        == 409
    )
    assert (
        c.put(
            f"/api/v1/admin/quotes/{id}",
            json={"status": "quoted", "quoted_price": "180", "staff_notes": "Aprobado"},
        ).status_code
        == 200
    )
    result = c.post(
        f"/api/v1/admin/quotes/{id}/convert", json={"product_id": 1, "quantity": 1}
    )
    assert result.status_code == 201, result.text
    order = c.get("/api/v1/admin/orders/" + str(result.json()["id"])).json()
    assert order["total"] == "180.00"
    assert order["items"][0]["unit_price"] == "180.00"
    assert (
        c.post(
            f"/api/v1/admin/quotes/{id}/convert", json={"product_id": 1, "quantity": 1}
        ).status_code
        == 409
    )


def test_production_financial_privacy(setup):
    c, _ = setup
    order = make_order(c)
    result = c.post(
        "/api/v1/auth/login",
        json={"email": "production@example.com", "password": "A-test-password-123"},
    )
    c.headers["Authorization"] = "Bearer " + result.json()["access_token"]
    data = c.get("/api/v1/admin/orders/" + str(order["id"])).json()
    assert "payments" not in data and "total" not in data and "balance" not in data
    assert "unit_price" not in data["items"][0]


def test_upload_and_product_gallery(setup):
    c, _ = setup
    from io import BytesIO
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (20, 20), (255, 200, 220)).save(buffer, "PNG")
    response = c.post(
        "/api/v1/uploads",
        files={"file": ("reference.png", buffer.getvalue(), "image/png")},
    )
    assert response.status_code == 201, response.text
    path = response.json()["url"]
    try:
        assert (
            c.post(
                "/api/v1/admin/product-images",
                json={"product_id": 1, "url": path, "alt": "Referencia"},
            ).status_code
            == 201
        )
        assert len(c.get("/api/v1/products/1").json()["images"]) == 1
        assert c.get(path).status_code == 200
    finally:
        from app.config import settings

        (settings.upload_dir / path.split("/")[-1]).unlink(missing_ok=True)


def test_inactive_product_rejected_and_self_lockout(setup):
    c, _ = setup
    data = c.get("/api/v1/admin/products/1").json()
    payload = {
        k: data[k]
        for k in [
            "name",
            "slug",
            "category_id",
            "price",
            "description",
            "is_active",
            "is_featured",
            "image_url",
        ]
    }
    payload["is_active"] = False
    assert c.put("/api/v1/admin/products/1", json=payload).status_code == 200
    assert c.get("/api/v1/products/").json() == []
    assert c.get("/api/v1/products/1").status_code == 404
    result = c.post(
        "/api/v1/admin/orders",
        json={
            "customer_id": 1,
            "due_date": str(date.today() + timedelta(days=1)),
            "items": [{"product_id": 1, "quantity": 1}],
            "request_key": str(uuid4()),
        },
    )
    assert result.status_code == 422
    assert (
        c.put(
            "/api/v1/admin/users/1",
            json={"name": "Admin", "role": "sales", "is_active": True},
        ).status_code
        == 409
    )


def test_fractional_recipe_consumption_aggregates_before_rounding(setup):
    c, engine = setup
    assert (
        c.put(
            "/api/v1/admin/recipes/1",
            json={
                "product_id": 1,
                "name": "Base fraccionada",
                "yield_quantity": "3",
                "items": [{"ingredient_id": 1, "quantity": "1"}],
            },
        ).status_code
        == 200
    )
    p = c.post(
        "/api/v1/admin/products",
        json={
            "name": "Otra torta",
            "slug": "otra-torta",
            "category_id": 1,
            "price": "100",
        },
    ).json()
    assert (
        c.post(
            "/api/v1/admin/recipes",
            json={
                "product_id": p["id"],
                "name": "Otra base",
                "yield_quantity": "3",
                "items": [{"ingredient_id": 1, "quantity": "1"}],
            },
        ).status_code
        == 201
    )
    response = c.post(
        "/api/v1/admin/orders",
        json={
            "customer_id": 1,
            "due_date": str(date.today() + timedelta(days=1)),
            "items": [
                {"product_id": 1, "quantity": 1},
                {"product_id": p["id"], "quantity": 1},
            ],
            "request_key": str(uuid4()),
        },
    )
    assert response.status_code == 201, response.text
    id = response.json()["id"]
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "confirmed"}
        ).status_code
        == 200
    )
    assert (
        c.post(
            f"/api/v1/admin/orders/{id}/status", json={"status": "production"}
        ).status_code
        == 200
    )
    with Session(engine) as db:
        assert db.get(Ingredient, 1).stock == Decimal("9.333")
        assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 1
