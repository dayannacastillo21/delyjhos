from sqlalchemy.orm import Session
from app.models.snacks import Snack
from tests.test_snacks import seed
from tests.test_snacks import proposal
from app.models.snacks import SnackQuote


def test_package_publication_requires_visible_components_and_preserves_quantities(
    setup,
):
    client, engine = setup
    seed(engine)
    payload = {
        "name": "Paquete revisado",
        "description": "Selección del negocio",
        "is_published": True,
        "items": [
            {"presentation_id": 1, "packs": 2},
            {"presentation_id": 4, "packs": 1},
        ],
    }
    assert client.post("/api/v1/admin/snack-packages", json=payload).status_code == 409
    payload["is_published"] = False
    created = client.post("/api/v1/admin/snack-packages", json=payload)
    assert created.status_code == 201, created.text
    assert client.get("/api/v1/snack-packages").json() == []
    seed(engine, publish=True)
    payload["is_published"] = True
    payload["items"][0]["packs"] = 3
    assert (
        client.put(
            f"/api/v1/admin/snack-packages/{created.json()['id']}", json=payload
        ).status_code
        == 200
    )
    result = client.get("/api/v1/snack-packages").json()
    assert result[0]["items"][0]["packs"] == 3
    assert "historical_price" not in str(result)
    with Session(engine) as db:
        db.get(Snack, 1).is_published = False
        db.commit()
    assert client.get("/api/v1/snack-packages").json() == []


def test_guest_guidance_is_optional_and_has_consistent_bounds(setup):
    client, _ = setup
    payload = {
        "name": "DelyJhos",
        "whatsapp_number": "",
        "demo_catalog": True,
        "snack_min_per_guest": "2.50",
        "snack_max_per_guest": "4.00",
    }
    assert client.put("/api/v1/business/settings", json=payload).status_code == 200
    settings = client.get("/api/v1/settings").json()
    assert settings["snack_min_per_guest"] == "2.50"
    payload["snack_max_per_guest"] = "1.00"
    assert client.put("/api/v1/business/settings", json=payload).status_code == 422
    payload["snack_max_per_guest"] = None
    assert client.put("/api/v1/business/settings", json=payload).status_code == 422
    payload["snack_min_per_guest"] = None
    assert client.put("/api/v1/business/settings", json=payload).status_code == 200
    assert client.get("/api/v1/settings").json()["snack_min_per_guest"] is None


def test_public_proposal_submission_has_a_persistent_source_limit(setup):
    client, _ = setup
    for index in range(15):
        data = proposal(variant=99999)
        data["request_key"] = f"invalid-proposal-request-{index:04}"
        assert client.post("/api/v1/snack-quotes", json=data).status_code == 422
    assert (
        client.post("/api/v1/snack-quotes", json=proposal(variant=99999)).status_code
        == 429
    )


def test_private_proposal_tracking_exposes_no_customer_or_staff_data(setup):
    client, engine = setup
    seed(engine, publish=True)
    response = client.post("/api/v1/snack-quotes", json=proposal())
    token = response.json()["tracking_token"]
    id = response.json()["id"]
    with Session(engine) as db:
        assert db.get(SnackQuote, id).tracking_hash != token
    client.put(
        f"/api/v1/admin/snack-quotes/{id}",
        json={
            "status": "quoted",
            "quoted_price": "80.00",
            "staff_notes": "INTERNAL-NOTE-PRIVATE",
        },
    )
    assert "tracking_hash" not in client.get(f"/api/v1/admin/snack-quotes/{id}").text
    client.headers.pop("Authorization")
    result = client.post("/api/v1/snack-quotes/track", json={"token": token})
    assert result.status_code == 200
    assert result.json()["quoted_price"] == "80.00"
    assert result.json()["items"][0]["name"] == "Empanaditas de carne"
    for secret in [
        "INTERNAL-NOTE-PRIVATE",
        "999999999",
        "Cliente mesa",
        "tracking_hash",
        "product_id",
    ]:
        assert secret not in result.text
    assert (
        client.post("/api/v1/snack-quotes/track", json={"token": "x" * 43}).status_code
        == 404
    )
