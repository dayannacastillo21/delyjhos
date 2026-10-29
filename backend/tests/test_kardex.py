from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import InventoryMovement, Ingredient


def seed(engine):
    with Session(engine) as db:
        for id, timestamp, qty, balance, kind in [
            (1, "2026-10-20T04:59:00", 2, 12, "adjustment"),
            (2, "2026-10-20T05:00:00", 5, 17, "purchase"),
            (3, "2026-10-21T04:59:00", -3, 14, "production"),
            (4, "2026-10-21T05:00:00", 1, 15, "adjustment"),
        ]:
            db.add(
                InventoryMovement(
                    id=id,
                    ingredient_id=1,
                    quantity=qty,
                    balance_after=balance,
                    kind=kind,
                    reason="Prueba",
                    source_key=f"test:{id}",
                    created_by=1,
                    created_at=datetime.fromisoformat(timestamp).replace(
                        tzinfo=timezone.utc
                    ),
                )
            )
        db.get(Ingredient, 1).stock = 15
        db.commit()


def test_kardex_lima_range_and_pagination_keep_full_period_totals(setup):
    client, engine = setup
    seed(engine)
    response = client.get(
        "/api/v1/inventory/kardex?ingredient_id=1&from_date=2026-10-20&to_date=2026-10-20&limit=1&offset=1"
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert (data["opening"], data["incoming"], data["outgoing"], data["closing"]) == (
        "12.000",
        "5.000",
        "3.000",
        "14.000",
    )
    assert data["total"] == 2 and data["reconciled"]
    assert [row["id"] for row in data["rows"]] == [3]
    assert data["rows"][0]["balance"] == "14.000"
    assert data["rows"][0]["created_at"].endswith("-05:00")
    assert data["rows"][0]["responsible"] == "Admin"


def test_kardex_all_history_and_empty_period(setup):
    client, engine = setup
    seed(engine)
    data = client.get("/api/v1/inventory/kardex?ingredient_id=1").json()
    assert (data["opening"], data["incoming"], data["outgoing"], data["closing"]) == (
        "10.000",
        "8.000",
        "3.000",
        "15.000",
    )
    assert [row["id"] for row in data["rows"]] == [1, 2, 3, 4]
    data = client.get(
        "/api/v1/inventory/kardex?ingredient_id=1&from_date=2026-11-01&to_date=2026-11-02"
    ).json()
    assert data["rows"] == []
    assert data["opening"] == data["closing"] == "15.000"
    assert data["incoming"] == data["outgoing"] == "0.000"
    assert data["reconciled"]


def test_kardex_unknown_history_validation_and_auth(setup):
    client, _ = setup
    data = client.get("/api/v1/inventory/kardex?ingredient_id=1").json()
    assert not data["history_available"]
    assert data["opening"] == data["closing"] == "10.000"
    assert client.get("/api/v1/inventory/kardex?ingredient_id=999").status_code == 404
    assert (
        client.get(
            "/api/v1/inventory/kardex?ingredient_id=1&from_date=2026-11-01&to_date=2026-10-01"
        ).status_code
        == 422
    )
    assert (
        client.get("/api/v1/inventory/kardex?ingredient_id=1&offset=-1").status_code
        == 422
    )
    client.headers.pop("Authorization")
    assert client.get("/api/v1/inventory/kardex?ingredient_id=1").status_code == 401


def test_kardex_detects_unreconciled_stored_balances(setup):
    client, engine = setup
    seed(engine)
    with Session(engine) as db:
        db.get(InventoryMovement, 3).balance_after = Decimal("13")
        db.commit()
    data = client.get(
        "/api/v1/inventory/kardex?ingredient_id=1&from_date=2026-10-20&to_date=2026-10-20"
    ).json()
    assert not data["reconciled"]
