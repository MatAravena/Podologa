"""Tests for /opiniones endpoints."""
from models import Opinion


def _seed_opinion(db, nombre="Ana", apellido="González", puntuacion="5.0"):
    op = Opinion(
        nombre=nombre,
        apellido=apellido,
        texto="Excelente atención, muy recomendada.",
        puntuacion=puntuacion,
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op


class TestListarOpiniones:
    def test_returns_empty_list(self, client):
        resp = client.get("/opiniones")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_existing_opinions(self, client, db):
        _seed_opinion(db)
        resp = client.get("/opiniones")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["nombre"] == "Ana"

    def test_sorted_newest_first(self, client, db):
        _seed_opinion(db, nombre="Primero")
        _seed_opinion(db, nombre="Segundo")
        resp = client.get("/opiniones")
        nombres = [o["nombre"] for o in resp.json()]
        assert nombres[0] == "Segundo"


class TestCrearOpinion:
    def test_creates_valid_opinion(self, client):
        payload = {
            "nombre": "María",
            "apellido": "Pérez",
            "texto": "Muy buen servicio, lo recomiendo.",
            "puntuacion": "4.5",
            "servicios_ids": [1, 2],
        }
        resp = client.post("/opiniones", json=payload)
        assert resp.status_code == 201
        body = resp.json()
        assert body["nombre"] == "María"
        assert body["puntuacion"] == "4.5"

    def test_rejects_short_text(self, client):
        payload = {
            "nombre": "Juan",
            "apellido": "Díaz",
            "texto": "corto",
            "puntuacion": "3.0",
        }
        resp = client.post("/opiniones", json=payload)
        assert resp.status_code == 422

    def test_rejects_invalid_puntuacion_not_half_increment(self, client):
        payload = {
            "nombre": "Juan",
            "apellido": "Díaz",
            "texto": "Servicio muy bueno y profesional.",
            "puntuacion": "3.3",  # not a 0.5 increment
        }
        resp = client.post("/opiniones", json=payload)
        assert resp.status_code == 422


class TestEliminarOpinion:
    def test_delete_requires_auth(self, client, db):
        op = _seed_opinion(db)
        resp = client.delete(f"/opiniones/{op.id}")
        assert resp.status_code == 401

    def test_admin_can_delete(self, client, db, auth_headers):
        op = _seed_opinion(db)
        resp = client.delete(f"/opiniones/{op.id}", headers=auth_headers)
        assert resp.status_code == 204
        # Verify gone
        assert client.get("/opiniones").json() == []

    def test_delete_nonexistent_returns_404(self, client, auth_headers):
        resp = client.delete("/opiniones/9999", headers=auth_headers)
        assert resp.status_code == 404
