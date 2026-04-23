from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # verifica conexión antes de usarla
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependencia de FastAPI para inyectar la sesión de BD."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
