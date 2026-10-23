from datetime import timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.works import Work
from app.models.business import QuoteRequest, Order
from app.services import business_today
from app.config import settings


def seed_work(engine, published=True):
    with Session(engine) as db:
        db.add(
            Work(
                slug="real-work",
                title="Torta real de bautizo",
                description="Trabajo original",
                occasion="Bautizo",
                video_url="/media/works/work-02/video.mp4",
                poster_url="/media/works/work-02/poster.webp",
                gallery=["/media/works/work-02/detail-1.webp"],
                width=576,
                height=1024,
                duration=25.2,
                is_published=published,
                product_id=1,
            )
        )
        db.commit()


def quote():
    return {
        "name": "Cliente inspiración",
        "phone": "999999999",
        "theme": "Bautizo blanco",
        "portions": 30,
        "flavor": "Vainilla",
        "due_date": str(business_today() + timedelta(days=10)),
        "request_key": "work-request-key-12345",
        "reference_work_id": 1,
        "celebration": "Bautizo",
        "preferred_colors": "Blanco y dorado",
        "cake_message": "Mi bautizo",
        "comments": "Coordinar entrega",
    }


def test_reference_snapshot_survives_edits_and_conversion(setup):
    client, engine = setup
    seed_work(engine)
    public = client.get("/api/v1/works").json()
    assert len(public) == 1 and public[0]["product_id"] == 1
    request = quote()
    request["comments"] = "Coordinar entrega" + "x" * 2983
    result = client.post("/api/v1/quotes/", json=request)
    assert result.status_code == 201, result.text
    id = result.json()["id"]
    with Session(engine) as db:
        db.get(Work, 1).title = "Título actualizado"
        db.get(Work, 1).is_published = False
        db.commit()
        saved = db.get(QuoteRequest, id)
        assert saved.reference_work["title"] == "Torta real de bautizo"
        assert saved.reference_work["video_url"] == "/media/works/work-02/video.mp4"
    detail = client.get(f"/api/v1/admin/quotes/{id}").json()
    assert detail["preferred_colors"] == "Blanco y dorado"
    assert detail["reference_work"]["title"] == "Torta real de bautizo"
    assert (
        client.put(
            f"/api/v1/admin/quotes/{id}",
            json={
                "status": "quoted",
                "quoted_price": "180.00",
                "staff_notes": "Precio revisado",
            },
        ).status_code
        == 200
    )
    converted = client.post(
        f"/api/v1/admin/quotes/{id}/convert", json={"product_id": 1}
    )
    assert converted.status_code == 201
    with Session(engine) as db:
        order = db.get(Order, converted.json()["id"])
        for value in [
            "Blanco y dorado",
            "Mi bautizo",
            "Coordinar entrega",
            "Torta real de bautizo",
        ]:
            assert value in order.notes
        assert request["comments"] in order.notes


def test_hidden_work_and_client_snapshot_rejected(setup):
    client, engine = setup
    seed_work(engine, published=False)
    assert client.get("/api/v1/works").json() == []
    assert client.post("/api/v1/quotes/", json=quote()).status_code == 422
    data = quote()
    data["reference_work"] = {"title": "Fake reference"}
    assert client.post("/api/v1/quotes/", json=data).status_code == 422


def test_video_upload_authorization_container_validation_and_original_bytes(
    setup, tmp_path, monkeypatch
):
    client, _ = setup
    monkeypatch.setattr(settings, "upload_dir", tmp_path)
    assert (
        client.post(
            "/api/v1/work-videos/upload",
            files={"file": ("fake.mp4", b"not a video", "video/mp4")},
        ).status_code
        == 422
    )
    video = (
        Path(__file__).resolve().parents[2]
        / "frontend/public/media/works/work-03/video.mp4"
    )
    data = video.read_bytes()
    result = client.post(
        "/api/v1/work-videos/upload",
        files={"file": ("football.mp4", data, "video/mp4")},
    )
    assert result.status_code == 201, result.text
    assert (tmp_path / result.json()["url"].split("/")[-1]).read_bytes() == data
    client.headers.pop("Authorization")
    assert (
        client.post(
            "/api/v1/work-videos/upload",
            files={"file": ("video.mp4", data, "video/mp4")},
        ).status_code
        == 401
    )


def test_admin_work_cannot_reference_remote_or_traversal_assets(setup):
    client, engine = setup
    seed_work(engine)
    row = client.get("/api/v1/admin/works/1").json()
    data = {
        key: row[key]
        for key in [
            "slug",
            "title",
            "description",
            "occasion",
            "video_url",
            "poster_url",
            "gallery",
            "width",
            "height",
            "duration",
            "product_id",
            "is_published",
        ]
    }
    for url in [
        "https://example.com/video.mp4",
        "/media/works/../../private.mp4",
        "/uploads/fake.html",
    ]:
        data["video_url"] = url
        assert client.put("/api/v1/admin/works/1", json=data).status_code == 422
