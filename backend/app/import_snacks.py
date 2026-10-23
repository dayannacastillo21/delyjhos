"""Idempotent draft import; never publishes or confirms historical prices."""

import json
from pathlib import Path
from decimal import Decimal
from sqlalchemy import select
from app.database import SessionLocal
from app.models.snacks import Snack, SnackPresentation

SOURCE = "CATALOGO DELYJHOS 2025.pdf"


def import_catalog(db):
    records = json.loads(
        (Path(__file__).parent / "data" / "snacks-2025.json").read_text(
            encoding="utf-8"
        )
    )
    created = 0
    for record in records:
        snack = db.scalar(select(Snack).where(Snack.slug == record["slug"]))
        if snack is not None:
            continue  # Preserve all subsequent administrative edits.
        snack = Snack(
            name=record["name"],
            slug=record["slug"],
            kind=record["kind"],
            source_page=record["page"],
            source_document=SOURCE,
            description="",
            is_available=False,
            is_published=False,
        )
        db.add(snack)
        db.flush()
        for units, price in record["prices"].items():
            db.add(
                SnackPresentation(
                    snack_id=snack.id,
                    units=int(units),
                    historical_price=Decimal(price),
                    source_year=2025,
                    current_price=None,
                    price_confirmed=False,
                )
            )
        created += 1
    db.flush()
    return created


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        count = import_catalog(session)
    print(f"{count} bocaditos creados en borrador. Ningún precio histórico publicado.")
