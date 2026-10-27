"""Publish the user-approved 2025 catalog once; preserve later admin edits."""
import argparse
import json
from pathlib import Path
from sqlalchemy import select
from app.database import SessionLocal
from app.models import User, Role, AuditLog
from app.models.snacks import Snack, SnackPresentation

DATA = Path(__file__).parent / 'data'
ACTION = 'publish_snack_catalog_2025'


def publish_catalog(db, actor):
    approved = json.loads((DATA / 'snacks-2025.json').read_text(encoding='utf-8'))
    photos = {r['slug']: r for r in json.loads((DATA / 'snack-photos-2025.json').read_text(encoding='utf-8'))}
    completed = set(db.scalars(select(AuditLog.entity_id).where(AuditLog.action == ACTION, AuditLog.entity == 'snacks')))
    count = 0
    for record in approved:
        row = db.scalar(select(Snack).where(Snack.slug == record['slug']).with_for_update())
        if row is None:
            raise ValueError(f"Importa primero el catálogo: falta {record['slug']}")
        if row.id in completed:
            continue
        variants = db.scalars(select(SnackPresentation).where(SnackPresentation.snack_id == row.id).with_for_update()).all()
        if {v.units for v in variants} != {25,50,100}:
            raise ValueError(f"Presentaciones incompletas: {row.name}")
        photo = photos[record['slug']]
        asset = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / photo['image_url'].lstrip('/')
        if not asset.is_file():
            raise ValueError(f"Falta la fotografía de {row.name}")
        before = {'image_url': row.image_url, 'is_published': row.is_published, 'description': row.description, 'prices': [{'id': v.id, 'current_price': str(v.current_price) if v.current_price is not None else None, 'confirmed': v.price_confirmed} for v in variants]}
        if not row.image_url:
            row.image_url = photo['image_url']
        if not row.description:
            row.description = f"{row.name} para acompañar tu celebración. Elige presentaciones de 25, 50 o 100 unidades."
        for variant in variants:
            if variant.current_price is None:
                # Explicit user approval applies to these source prices only.
                from decimal import Decimal
                variant.current_price = Decimal(record['prices'][str(variant.units)])
                variant.price_confirmed = True
        row.is_published = True
        db.add(AuditLog(user_id=actor.id, action=ACTION, entity='snacks', entity_id=row.id, details=json.dumps({'authorization': 'User requested catalog photos, publication and 2025 catalog prices', 'before': before, 'photo': photo['source']},ensure_ascii=False)))
        count += 1
    db.flush()
    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true',required=True)
    parser.parse_args()
    with SessionLocal.begin() as db:
        actor = db.scalar(select(User).join(Role, User.role_id == Role.id).where(Role.name == 'admin', User.is_active.is_(True)).order_by(User.id))
        if actor is None:
            raise ValueError('Se requiere un administrador activo para registrar la publicación.')
        count = publish_catalog(db, actor)
    print(f'{count} bocaditos publicados. Precios e imágenes cargados; ediciones posteriores conservadas.')
