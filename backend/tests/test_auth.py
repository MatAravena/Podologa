"""Tests for /auth/login and /auth/bootstrap endpoints."""
from config import settings


class TestLogin:
    def test_login_valid_credentials(self, client, admin_user):
        resp = client.post(
            "/auth/login",
            data={"username": "testadmin", "password": "password123"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post(
            "/auth/login",
            data={"username": "testadmin", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    def test_login_unknown_user(self, client):
        resp = client.post(
            "/auth/login",
            data={"username": "nobody", "password": "password123"},
        )
        assert resp.status_code == 401

    def test_login_inactive_user(self, client, db, admin_user):
        admin_user.is_active = False
        db.commit()

        resp = client.post(
            "/auth/login",
            data={"username": "testadmin", "password": "password123"},
        )
        assert resp.status_code == 401


class TestBootstrap:
    def test_bootstrap_creates_admin(self, client):
        resp = client.post(
            "/auth/bootstrap",
            json={
                "username": "newadmin",
                "email": "new@test.cl",
                "password": "securepass123",
                "bootstrap_secret": settings.SECRET_KEY,
            },
        )
        assert resp.status_code == 201
        assert "access_token" in resp.json()

    def test_bootstrap_wrong_secret(self, client):
        resp = client.post(
            "/auth/bootstrap",
            json={
                "username": "newadmin",
                "email": "new@test.cl",
                "password": "securepass123",
                "bootstrap_secret": "thisisthewrongsecret",
            },
        )
        assert resp.status_code == 403

    def test_bootstrap_duplicate_username(self, client, admin_user):
        resp = client.post(
            "/auth/bootstrap",
            json={
                "username": "testadmin",
                "email": "other@test.cl",
                "password": "securepass123",
                "bootstrap_secret": settings.SECRET_KEY,
            },
        )
        assert resp.status_code == 409
