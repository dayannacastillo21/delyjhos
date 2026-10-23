"""Idempotent local setup. Never logs credentials or overwrites an existing admin."""

import argparse
import secrets
from pathlib import Path
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Role, User, Category, Product
from app.security import password_hash


def bootstrap(demo=False):
    credentials = None
    with SessionLocal.begin() as db:
        for name in ["admin", "manager", "sales", "production"]:
            if not db.scalar(select(Role).where(Role.name == name)):
                db.add(Role(name=name))
        db.flush()
        admin_role = db.scalar(select(Role).where(Role.name == "admin"))
        if not db.scalar(
            select(User).where(User.role_id == admin_role.id, User.is_active.is_(True))
        ):
            password = secrets.token_urlsafe(24)
            user = User(
                name="Administración DelyJhos",
                email="admin@example.com",
                role_id=admin_role.id,
                password_hash=password_hash.hash(password),
            )
            db.add(user)
            credentials = f"Cuenta administrativa inicial (correo de ejemplo, no envía emails)\nCorreo: admin@example.com\nContraseña: {password}\n\nGuarda esta contraseña de forma privada. Puedes cambiarla en Usuarios.\n"
        for name, slug in [
            ("Tortas temáticas", "tortas-tematicas"),
            ("Bocaditos", "bocaditos"),
            ("Dulces", "dulces"),
            ("Productos salados", "productos-salados"),
        ]:
            if not db.scalar(select(Category).where(Category.slug == slug)):
                db.add(Category(name=name, slug=slug))
        db.flush()
        if demo:
            samples = [
                ("Torta Unicornio", "torta-unicornio", "tortas-tematicas", 120),
                ("Torta de Chocolate", "torta-chocolate", "tortas-tematicas", 95),
                ("Bocaditos Variados (50 unid)", "bocaditos-variados", "bocaditos", 80),
                ("Cupcakes Decorados", "cupcakes-decorados", "bocaditos", 60),
                ("Galletas Decoradas", "galletas-decoradas", "dulces", 35),
                (
                    "Empanadas de Pollo (12 unid)",
                    "empanadas-pollo",
                    "productos-salados",
                    25,
                ),
            ]
            for name, slug, category, price in samples:
                if not db.scalar(select(Product).where(Product.slug == slug)):
                    cat = db.scalar(select(Category).where(Category.slug == category))
                    db.add(
                        Product(
                            name=name,
                            slug=slug,
                            category_id=cat.id,
                            price=price,
                            is_featured=True,
                            description="Producto inicial de muestra. Precio, ingredientes, fotografía y disponibilidad deben confirmarse con DelyJhos antes de utilizar el catálogo comercialmente.",
                        )
                    )
    if credentials:
        path = Path(__file__).resolve().parents[1] / ".initial-admin.txt"
        path.write_text(credentials, encoding="utf-8")
        print(
            "Cuenta inicial creada. Credenciales guardadas únicamente en backend/.initial-admin.txt (excluido de Git)."
        )
    else:
        print("Ya existe un administrador activo; se conserva su contraseña.")
    print("Configuración inicial completada sin reemplazar registros existentes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Cargar los seis productos de ejemplo de la referencia",
    )
    bootstrap(parser.parse_args().demo)
