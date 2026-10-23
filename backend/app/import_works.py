"""Register prepared real works without inventing products, recipes or prices."""

import json
from pathlib import Path
from sqlalchemy import select
from app.database import SessionLocal
from app.models.works import Work


def import_works(db, records):
    created = 0
    for record in records:
        if db.scalar(select(Work.id).where(Work.slug == record["slug"])) is not None:
            continue
        base = "/media/works/" + record["slug"]
        db.add(
            Work(
                slug=record["slug"],
                title=record["title"],
                description=record["description"],
                occasion=record["occasion"],
                video_url=base + "/video.mp4",
                poster_url=base + "/poster.webp",
                gallery=[
                    base + f"/detail-{i}.webp"
                    for i in range(1, len(record["selected_seconds"]))
                ],
                width=576,
                height=1024,
                duration=record["duration"],
                product_id=None,
                is_published=True,
            )
        )
        created += 1
    db.flush()
    return created


if __name__ == "__main__":
    # Pass the generated manifest explicitly in deployments with separate frontend/backend folders.
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    records = json.loads(args.manifest.read_text(encoding="utf-8"))
    with SessionLocal.begin() as session:
        count = import_works(session, records)
    print(
        f"{count} trabajos reales registrados; no se crean precios ni productos ficticios."
    )
