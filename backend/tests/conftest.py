"""
Shared pytest fixtures for Libélula Podología backend tests.

Uses an in-memory SQLite database so no real PostgreSQL is needed.
FastAPI's dependency injection is overridden to inject the test session.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import create_access_token, hash_password
from database import get_db
from main import app
from models import Base, User

# ── In-memory SQLite engine for tests ─────────────────────────────────────────
# StaticPool forces all connections to reuse the same in-memory DB so that
# tables created in fixtures are visible to the TestClient's requests.
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# ── Override FastAPI's get_db dependency ──────────────────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    """Create all tables before each test, drop them after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db():
    """Provide a raw DB session for direct model manipulation in tests."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    """TestClient bound to the FastAPI app with test DB."""
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def admin_user(db):
    """Create an admin user and return it."""
    user = User(
        username="testadmin",
        email="admin@test.cl",
        hashed_password=hash_password("password123"),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_token(admin_user):
    """Return a valid JWT for the admin user."""
    return create_access_token({"sub": admin_user.username, "admin": True})


@pytest.fixture()
def auth_headers(admin_token):
    """Return Authorization headers with admin JWT."""
    return {"Authorization": f"Bearer {admin_token}"}
