from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DelyJhos API",
    description="API del sistema de gestión para la pastelería DelyJhos.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=[],
)


@app.get("/", tags=["Estado"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "DelyJhos API"}