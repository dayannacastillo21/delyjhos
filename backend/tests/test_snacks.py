from datetime import timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.import_snacks import import_catalog
from app.models.snacks import Snack, SnackPresentation, SnackQuote
from app.services import business_today


def seed(engine, publish=False):
    with Session(engine) as db:
        count = import_catalog(db)
        if publish:
            for snack in db.scalars(select(Snack)):
                snack.is_published = True
        db.commit()
        return count


def proposal(variant=1):
    return {
        "name": "Cliente mesa",
        "phone": "999999999",
        "celebration": "Cumpleaños",
        "due_date": str(business_today() + timedelta(days=10)),
        "guests": 20,
        "comments": "Sin confirmar aún",
        "items": [{"presentation_id": variant, "packs": 2}],
        "request_key": "unique-snack-request-12345",
    }


def test_import_is_draft_idempotent_and_preserves_admin_edits(setup):
    client, engine = setup
    assert seed(engine) == 31
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(SnackPresentation)) == 93
        snack = db.get(Snack, 1)
        snack.name = "Nombre revisado"
        db.commit()
    assert seed(engine) == 0
    with Session(engine) as db:
        assert db.get(Snack, 1).name == "Nombre revisado"
    assert client.get("/api/v1/snacks").json() == []
    assert len(client.get("/api/v1/snacks/preview").json()) == 31
    client.headers.pop("Authorization")
    assert client.get("/api/v1/snacks/preview").status_code == 401


def test_public_never_exposes_historical_or_unconfirmed_prices(setup):
    client, engine = setup
    seed(engine, publish=True)
    with Session(engine) as db:
        variant = db.get(SnackPresentation, 1)
        variant.current_price = 45
        db.commit()
    response = client.get("/api/v1/snacks")
    assert response.status_code == 200
    assert len(response.json()) == 31
    assert "historical_price" not in response.text
    assert "source_year" not in response.text
    assert all(v["price"] is None for s in response.json() for v in s["presentations"])
    with Session(engine) as db:
        db.get(SnackPresentation, 1).price_confirmed = True
        db.commit()
    prices = [
        v["price"]
        for s in client.get("/api/v1/snacks").json()
        for v in s["presentations"]
    ]
    assert prices.count("45.00") == 1


def test_quote_snapshots_server_data_and_rejects_client_prices(setup):
    client, engine = setup
    seed(engine, publish=True)
    client.headers.pop("Authorization")
    invalid = proposal()
    invalid["items"][0]["price"] = "0.01"
    assert client.post("/api/v1/snack-quotes", json=invalid).status_code == 422
    assert client.post("/api/v1/snack-quotes", json=proposal()).status_code == 201
    assert client.post("/api/v1/snack-quotes", json=proposal()).status_code == 409
    with Session(engine) as db:
        row = db.scalar(select(SnackQuote))
        assert row.items[0]["name"] == "Empanaditas de carne"
        assert row.items[0]["units"] == 25
        assert row.items[0]["price"] is None
        assert row.items[0]["availability_confirmed"] is False
    assert client.get("/api/v1/admin/snack-quotes").status_code == 401


def test_quotes_reject_hidden_products_and_duplicate_lines(setup):
    client, engine = setup
    seed(engine)
    assert client.post("/api/v1/snack-quotes", json=proposal()).status_code == 422
    seed(engine, publish=True)
    data = proposal()
    data["items"] *= 2
    assert client.post("/api/v1/snack-quotes", json=data).status_code == 422


def test_admin_requires_current_price_for_confirmation(setup):
    client, engine = setup
    seed(engine)
    row = client.get("/api/v1/admin/snack-presentations/1").json()
    payload = {
        key: row[key]
        for key in [
            "snack_id",
            "units",
            "historical_price",
            "source_year",
            "current_price",
            "price_confirmed",
        ]
    }
    payload["price_confirmed"] = True
    assert (
        client.put("/api/v1/admin/snack-presentations/1", json=payload).status_code
        == 422
    )
    payload["current_price"] = "42.00"
    assert (
        client.put("/api/v1/admin/snack-presentations/1", json=payload).status_code
        == 200
    )
