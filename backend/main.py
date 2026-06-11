from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import auth, citas, configuracion, disponibilidad, disponibilidad_admin, galeria, opiniones, pacientes, promociones, servicios, webhook
from scheduler import start_scheduler, stop_scheduler

IS_PROD = settings.APP_ENV.lower() in ("production", "prod")

# ── Security guard: refuse to start in production with an insecure SECRET_KEY ──
if IS_PROD and (settings.SECRET_KEY == "changeme" or len(settings.SECRET_KEY) < 32):
    raise RuntimeError(
        "SECRET_KEY inseguro en producción. Define un SECRET_KEY de al menos 32 "
        "caracteres aleatorios en las variables de entorno antes de desplegar."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Libélula Podología y Terapias — API",
    version="1.0.0",
    # Hide interactive docs in production (reduces attack surface / info leak)
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    lifespan=lifespan,
)

# ── CORS (origins read from config/app.json — never "*") ──────────────────────
# Exact origins (localhost dev) plus a regex for the Vercel frontend
# (production + preview deploys). Never uses "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Security headers on every response ────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(configuracion.router)
app.include_router(servicios.router)
app.include_router(disponibilidad.router)
app.include_router(disponibilidad_admin.router)
app.include_router(citas.router)
app.include_router(citas.admin_router)
app.include_router(opiniones.router)
app.include_router(pacientes.router)
app.include_router(promociones.router)
app.include_router(galeria.router)
app.include_router(webhook.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
