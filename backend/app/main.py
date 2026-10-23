from fastapi import FastAPI

app = FastAPI(
    title="DelyJhos API",
    description="API del sistema de gestión para la pastelería DelyJhos.",
    version="0.1.0",
)


@app.get("/", tags=["Estado"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "DelyJhos API"}