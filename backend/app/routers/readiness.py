"""Read-only operational checks. These do not certify production infrastructure."""

import re
from fastapi import APIRouter
from sqlalchemy import select, func
from app.security import DB, Actor, require
from app.config import settings
from app.models import BusinessSetting, Product, Recipe, RecipeIngredient
from app.models.snacks import Snack, SnackPresentation

router = APIRouter(prefix="/api/v1/business", tags=["Configuración"])


@router.get("/readiness")
def readiness(db: DB, actor: Actor):
    require(actor, db, "admin", "manager")
    business = db.get(BusinessSetting, 1)
    phone = business.whatsapp_number if business else settings.whatsapp_number
    phone_valid = bool(re.fullmatch(r"\+?[1-9][0-9]{8,14}", phone or ""))
    active = Product.is_active.is_(True)
    products = db.scalar(select(func.count()).select_from(Product).where(active))
    usable_recipe = (
        select(Recipe.id)
        .where(
            Recipe.product_id == Product.id,
            select(RecipeIngredient.id)
            .where(RecipeIngredient.recipe_id == Recipe.id)
            .exists(),
        )
        .exists()
    )
    missing_recipes = db.scalar(
        select(func.count()).select_from(Product).where(active, ~usable_recipe)
    )
    published = db.scalar(
        select(func.count()).select_from(Snack).where(Snack.is_published.is_(True))
    )
    presentations = (
        db.execute(
            select(SnackPresentation).join(Snack).where(Snack.is_published.is_(True))
        )
        .scalars()
        .all()
    )
    counts = {}
    for presentation in presentations:
        counts.setdefault(presentation.snack_id, set()).add(presentation.units)
    incomplete_prices = sum(
        not p.price_confirmed or p.current_price is None or p.current_price <= 0
        for p in presentations
    )
    incomplete_sets = published - sum(
        units == {25, 50, 100} for units in counts.values()
    )
    ready_products = set(db.scalars(select(Product.id).where(active, usable_recipe)))
    missing_production = sum(
        presentation.production_product_id not in ready_products
        for presentation in presentations
    )

    def check(key, title, passed, detail, section):
        return dict(
            key=key, title=title, passed=bool(passed), detail=detail, section=section
        )

    checks = [
        check(
            "contact",
            "WhatsApp de atención",
            phone_valid,
            (
                "Registra un número con código de país, sin espacios, para habilitar el contacto público."
                if not phone_valid
                else "Número de contacto configurado. La atención y recepción de mensajes se comprueban manualmente."
            ),
            "settings",
        ),
        check(
            "catalog",
            "Revisión de datos de muestra",
            business is not None and not business.demo_catalog,
            "Revisa los productos de muestra y desmarca esa opción en Configuración solo después de validarlos con el negocio.",
            "settings",
        ),
        check(
            "recipes",
            "Recetas para producción",
            products > 0 and missing_recipes == 0,
            f"{missing_recipes} de {products} productos activos sin receta con ingredientes. Se necesitan para confirmar pedidos.",
            "recipes",
        ),
        check(
            "snack_prices",
            "Precios de bocaditos",
            published > 0 and incomplete_prices == 0 and incomplete_sets == 0,
            f"{published} bocaditos publicados; {incomplete_prices} precios pendientes y {incomplete_sets} bocaditos sin las tres presentaciones.",
            "snacks",
        ),
        check(
            "snack_production",
            "Producción de bocaditos",
            published > 0 and incomplete_sets == 0 and missing_production == 0,
            f"{missing_production} presentaciones sin producto activo y receta con ingredientes. Pueden recibir consultas, pero necesitan esa vinculación antes de convertirlas a producción.",
            "snack-presentations",
        ),
    ]
    return {
        "checks": checks,
        "passed": sum(item["passed"] for item in checks),
        "total": len(checks),
        "manual_checks": [
            "Validar recetas, porciones, costos, ingredientes y alérgenos con la pastelería.",
            "Registrar las existencias reales y comprobar un pedido completo con el equipo.",
            "Publicar con HTTPS y dominios autorizados; probar acceso y pedidos desde el dominio final.",
            "Configurar almacenamiento persistente para las imágenes y comprobar copias de seguridad mediante una restauración.",
        ],
    }
