from decimal import Decimal
import pytest
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.import_snacks import import_catalog
from app.publish_snack_catalog import publish_catalog
from app.models import User, AuditLog
from app.models.snacks import Snack, SnackPresentation


def payload(client, snack_id=1):
    row = client.get(f'/api/v1/admin/snacks/{snack_id}').json()
    allowed = ['name','slug','kind','description','image_url','source_page','source_document','is_available','is_published']
    result = {key: row[key] for key in allowed}
    prices = client.get('/api/v1/admin/snack-presentations?limit=200').json()
    result['presentations'] = [{'id': x['id'], 'current_price': '42.50', 'price_confirmed': True} for x in prices if x['snack_id'] == snack_id]
    return result


def test_approved_publication_preserves_future_admin_edits(setup):
    client, engine = setup
    with Session(engine) as db:
        import_catalog(db)
        actor = db.scalar(select(User).order_by(User.id))
        assert publish_catalog(db, actor) == 31
        db.commit()
        assert db.scalar(select(func.count()).select_from(Snack).where(Snack.is_published.is_(True))) == 31
        assert db.scalar(select(func.count()).select_from(SnackPresentation).where(SnackPresentation.price_confirmed.is_(True))) == 93
        assert db.get(SnackPresentation, 1).current_price == Decimal('38')
        row = db.get(Snack, 1)
        row.name = 'Nombre editado'
        row.is_published = False
        db.get(SnackPresentation, 1).current_price = Decimal('46')
        db.commit()
        assert publish_catalog(db, actor) == 0
        db.commit()
        assert db.get(Snack, 1).name == 'Nombre editado'
        assert db.get(Snack, 1).is_published is False
        assert db.get(SnackPresentation, 1).current_price == Decimal('46')
        assert db.scalar(select(func.count()).select_from(AuditLog)) == 31
    public = client.get('/api/v1/snacks').json()
    assert len(public) == 30
    assert all(x['image_url'].startswith('/media/snacks/') for x in public)
    assert all(p['price'] is not None for x in public for p in x['presentations'])


def test_admin_edits_details_photo_and_all_prices_atomically(setup):
    client, engine = setup
    with Session(engine) as db:
        import_catalog(db)
        db.commit()
    data = payload(client)
    data.update(name='Empanaditas revisadas', image_url='/media/snacks/empanaditas-de-carne.webp', is_published=True)
    assert client.put('/api/v1/admin/snacks/1/catalog',json=data).status_code == 200
    public = client.get('/api/v1/snacks').json()[0]
    assert public['name'] == 'Empanaditas revisadas'
    assert len(public['presentations']) == 3
    assert all(x['price'] == '42.50' for x in public['presentations'])
    invalid = {**data,'name':'No debe guardarse','presentations':data['presentations'][:-1]}
    assert client.put('/api/v1/admin/snacks/1/catalog',json=invalid).status_code == 422
    assert client.get('/api/v1/snacks').json()[0]['name'] == 'Empanaditas revisadas'
    invalid = {**data,'name':'No guardar tampoco','presentations':[{**p,'current_price':None} for p in data['presentations']]}
    assert client.put('/api/v1/admin/snacks/1/catalog',json=invalid).status_code == 422
    client.headers.pop('Authorization')
    assert client.put('/api/v1/admin/snacks/1/catalog',json=data).status_code == 401


@pytest.mark.parametrize('url',['https://example.com/photo.jpg','/media/snacks/../secret.webp'])
def test_catalog_images_reject_untrusted_paths(setup,url):
    client, engine = setup
    with Session(engine) as db:
        import_catalog(db)
        db.commit()
    data = payload(client)
    data['image_url'] = url
    assert client.put('/api/v1/admin/snacks/1/catalog',json=data).status_code == 422
