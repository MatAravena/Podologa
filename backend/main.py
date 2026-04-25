from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import auth, citas, disponibilidad, disponibilidad_admin, galeria, opiniones, promociones, servicios, webhook
from scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Libélula Podología y Terapias — API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS (origins read from config/app.json) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(servicios.router)
app.include_router(disponibilidad.router)
app.include_router(disponibilidad_admin.router)
app.include_router(citas.router)
app.include_router(opiniones.router)
app.include_router(promociones.router)
app.include_router(galeria.router)
app.include_router(webhook.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
