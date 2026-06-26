"""Tests for /servicios endpoints."""
import json
from unittest.mock import patch

from models import Servicio


def _seed_servicio(db, nombre="Podología", duracion=60, precio="30000"):
    s = Servicio(nombre=nombre, descripcion=None, duracion=duracion, precio=precio)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


class TestListarServicios:
    def test_returns_empty_list(self, client):
        resp = client.get("/servicios")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_seeded_services(self, client, db):
        _seed_servicio(db, "Podología")
        _seed_servicio(db, "Reiki")
        resp = client.get("/servicios")
        assert resp.status_code == 200
        nombres = [s["nombre"] for s in resp.json()]
        assert "Podología" in nombres
        assert "Reiki" in nombres

    def test_services_sorted_by_name(self, client, db):
        _seed_servicio(db, "Reiki")
        _seed_servicio(db, "Podología")
        resp = client.get("/servicios")
        nombres = [s["nombre"] for s in resp.json()]
        assert nombres == sorted(nombres)


class TestObtenerServicio:
    def test_returns_404_for_missing(self, client):
        resp = client.get("/servicios/999")
        assert resp.status_code == 404

    def test_returns_service_by_id(self, client, db):
        s = _seed_servicio(db)
        resp = client.get(f"/servicios/{s.id}")
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Podología"
        assert resp.json()["duracion"] == 60


class TestAdminCrud:
    def test_create_requires_auth(self, client):
        resp = client.post("/servicios", json={"nombre": "Nuevo", "duracion": 30, "precio": 10000})
        assert resp.status_code == 401

    def test_admin_can_create(self, client, auth_headers):
        resp = client.post(
            "/servicios",
            json={"nombre": "Auriculoterapia", "duracion": 45, "precio": 18000, "icono": "ayuda"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["nombre"] == "Auriculoterapia"
        assert body["precio"] == 18000

    def test_admin_can_update(self, client, auth_headers, db):
        s = _seed_servicio(db)
        resp = client.patch(
            f"/servicios/{s.id}",
            json={"precio": 27000, "subtitulo": "Para tus pies"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["precio"] == 27000
        assert resp.json()["subtitulo"] == "Para tus pies"

    def test_update_404(self, client, auth_headers):
        resp = client.patch("/servicios/9999", json={"precio": 1}, headers=auth_headers)
        assert resp.status_code == 404

    def test_admin_can_delete(self, client, auth_headers, db):
        s = _seed_servicio(db)
        resp = client.delete(f"/servicios/{s.id}", headers=auth_headers)
        assert resp.status_code == 204
        assert db.query(Servicio).count() == 0

    def test_delete_404(self, client, auth_headers):
        assert client.delete("/servicios/9999", headers=auth_headers).status_code == 404


class TestFotos:
    def test_subir_foto_rejects_non_image(self, client, auth_headers, db):
        s = _seed_servicio(db)
        resp = client.post(
            f"/servicios/{s.id}/fotos",
            files={"file": ("nota.txt", b"hello", "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 415

    def test_subir_foto_ok(self, client, auth_headers, db):
        s = _seed_servicio(db)
        with patch("routers.servicios._cloudinary_config"), \
             patch("cloudinary.uploader.upload", return_value={"secure_url": "https://cdn/x.jpg"}):
            resp = client.post(
                f"/servicios/{s.id}/fotos",
                files={"file": ("foto.jpg", b"\xff\xd8\xff", "image/jpeg")},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        assert json.loads(resp.json()["fotos_urls"]) == ["https://cdn/x.jpg"]

    def test_eliminar_foto_ok(self, client, auth_headers, db):
        s = _seed_servicio(db)
        s.fotos_urls = json.dumps(["https://cdn/a.jpg", "https://cdn/b.jpg"])
        db.commit()

        with patch("routers.servicios._cloudinary_config"), \
             patch("cloudinary.uploader.destroy", return_value={"result": "ok"}):
            resp = client.delete(f"/servicios/{s.id}/fotos/0", headers=auth_headers)
        assert resp.status_code == 200
        assert json.loads(resp.json()["fotos_urls"]) == ["https://cdn/b.jpg"]

    def test_eliminar_foto_bad_index_404(self, client, auth_headers, db):
        s = _seed_servicio(db)
        s.fotos_urls = json.dumps(["https://cdn/a.jpg"])
        db.commit()
        resp = client.delete(f"/servicios/{s.id}/fotos/5", headers=auth_headers)
        assert resp.status_code == 404
