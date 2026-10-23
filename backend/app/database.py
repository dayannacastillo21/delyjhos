from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

url = settings.database_url.get_secret_value()
engine = create_engine(
    url,
    pool_pre_ping=True,
    connect_args=(
        {"connect_timeout": 10}
        if not url.startswith("sqlite")
        else {"check_same_thread": False}
    ),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
