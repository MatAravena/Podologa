"""Tests for /config endpoints."""


class TestObtenerContacto:
    def test_returns_200(self, client):
        resp = client.get("/config/contacto")
        assert resp.status_code == 200

    def test_exposes_expected_fields(self, client):
        body = client.get("/config/contacto").json()
        for key in ("phone", "email", "address", "instagram", "facebook"):
            assert key in body

    def test_does_not_expose_hours(self, client):
        # Opening hours come from /disponibilidad/semana, not the contact config.
        assert "business_hours" not in client.get("/config/contacto").json()

    def test_reads_values_from_app_config(self, client):
        from config import settings

        contact = settings.app_config.get("contact", {})
        body = client.get("/config/contacto").json()
        assert body["email"] == contact.get("email")
        assert body["phone"] == contact.get("phone")

    def test_does_not_leak_cors_or_secrets(self, client):
        body = client.get("/config/contacto").json()
        assert "cors_origins" not in body
        assert "booking" not in body
