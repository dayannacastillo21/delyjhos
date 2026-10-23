from pathlib import Path
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    database_url: SecretStr
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    session_hours: int = 8
    upload_dir: Path = Path(__file__).resolve().parents[1] / "uploads"
    public_url: str = "http://localhost:8000"
    whatsapp_number: str = ""
    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
