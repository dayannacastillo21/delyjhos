from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import text
from app.config import settings
from app.database import engine
from app.routers.business import router
from app.routers.snacks import router as snack_router
from app.routers.works import router as works_router

app = FastAPI(
    title="DelyJhos API",
    description="Gestión de catálogo, pedidos, producción e inventario.",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(",")],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 6 * 1024 * 1024:
                return JSONResponse(
                    status_code=413, content={"detail": "Solicitud demasiado grande"}
                )
            chunks.append(chunk)
        request._body = b"".join(chunks)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(
        status_code=409,
        content={
            "detail": "El registro ya existe o contiene relaciones inválidas. Revisa los datos."
        },
    )


@app.exception_handler(OperationalError)
async def database_error(request, exc):
    return JSONResponse(
        status_code=503,
        content={"detail": "La base de datos no está disponible. Intenta nuevamente."},
    )


@app.get("/", tags=["Estado"])
def root():
    return {"status": "ok", "service": "DelyJhos API"}


@app.get("/health", tags=["Estado"])
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


settings.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(router)
app.include_router(snack_router)
app.include_router(works_router)
