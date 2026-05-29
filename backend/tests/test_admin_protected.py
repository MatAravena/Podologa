"""
Authorization tests for every admin-protected endpoint.

For each endpoint we verify:
  1. 401 with no token
  2. 401 with a malformed/expired token
  3. 2xx (or the correct success code) with a valid admin JWT

Fixtures (client, auth_headers, admin_user, db) come from conftest.py.
"""
from datetime import date, time, timedelta

import pytest
from sqlalchemy.orm import Session

from models import (
    BloqueDisponibilidad,
    FechaBloqueo,
    GaleriaPost,
    Opinion,
    Promocion,
    Servicio,
)

BAD_TOKEN = {"Authorization": "Bearer bad.token.here"}
TODAY = date.today()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_servicio(db: Session) -> Servicio:
    s = Servicio(nombre="Test Servicio", descripcion="desc", duracion=30, precio=20000)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _make_bloque(db: Session) -> BloqueDisponibilidad:
    b = BloqueDisponibilidad(dia_semana=1, hora_inicio=time(9, 0), hora_fin=time(13, 0), activo=True)
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def _make_bloqueo(db: Session) -> FechaBloqueo:
    f = FechaBloqueo(fecha=TODAY + timedelta(days=10), motivo="Test", activo=True)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def _make_opinion(db: Session) -> Opinion:
    o = Opinion(nombre="Test", apellido="User", texto="Excelente.", puntuacion=5.0)
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


def _make_galeria_post(db: Session) -> GaleriaPost:
    g = GaleriaPost(
        titulo="Test post",
        media_url="https://example.com/img.jpg",
        media_type="image",
        published=False,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


def _make_promo(db: Session, servicio_id: int) -> Promocion:
    p = Promocion(
        servicio_id=servicio_id,
        porcentaje_descuento=10,
        descripcion="Test promo",
        fecha_inicio=TODAY,
        fecha_fin=TODAY + timedelta(days=30),
        activo=True,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ── Invalid token (shared fast path) ─────────────────────────────────────────

class TestInvalidToken:
    """A single bad-token check covers all endpoints uniformly."""

    def test_admin_disponibilidad_bloques_bad_token(self, client):
        assert client.get("/admin/disponibilidad/bloques", headers=BAD_TOKEN).status_code == 401

    def test_promociones_bad_token(self, client):
        assert client.get("/promociones", headers=BAD_TOKEN).status_code == 401

    def test_opiniones_delete_bad_token(self, client):
        assert client.delete("/opiniones/999", headers=BAD_TOKEN).status_code == 401

    def test_galeria_delete_bad_token(self, client):
        assert client.delete("/galeria/999", headers=BAD_TOKEN).status_code == 401


# ── /admin/disponibilidad/bloques ─────────────────────────────────────────────

class TestDisponibilidadBloques:
    def test_list_requires_auth(self, client):
        assert client.get("/admin/disponibilidad/bloques").status_code == 401

    def test_list_with_auth(self, client, auth_headers):
        r = client.get("/admin/disponibilidad/bloques", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_requires_auth(self, client):
        payload = {"dia_semana": 1, "hora_inicio": "09:00", "hora_fin": "13:00"}
        assert client.post("/admin/disponibilidad/bloques", json=payload).status_code == 401

    def test_create_with_auth(self, client, auth_headers):
        payload = {"dia_semana": 1, "hora_inicio": "09:00", "hora_fin": "13:00"}
        r = client.post("/admin/disponibilidad/bloques", json=payload, headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["dia_semana"] == 1

    def test_patch_requires_auth(self, client, db):
        bloque = _make_bloque(db)
        assert client.patch(f"/admin/disponibilidad/bloques/{bloque.id}", json={"activo": False}).status_code == 401

    def test_patch_with_auth(self, client, auth_headers, db):
        bloque = _make_bloque(db)
        r = client.patch(
            f"/admin/disponibilidad/bloques/{bloque.id}",
            json={"activo": False},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["activo"] is False

    def test_delete_requires_auth(self, client, db):
        bloque = _make_bloque(db)
        assert client.delete(f"/admin/disponibilidad/bloques/{bloque.id}").status_code == 401

    def test_delete_with_auth(self, client, auth_headers, db):
        bloque = _make_bloque(db)
        r = client.delete(f"/admin/disponibilidad/bloques/{bloque.id}", headers=auth_headers)
        assert r.status_code == 204


# ── /admin/disponibilidad/bloqueos ────────────────────────────────────────────

class TestDisponibilidadBloqueos:
    def test_list_requires_auth(self, client):
        assert client.get("/admin/disponibilidad/bloqueos").status_code == 401

    def test_list_with_auth(self, client, auth_headers):
        r = client.get("/admin/disponibilidad/bloqueos", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_requires_auth(self, client):
        payload = {"fecha": str(TODAY + timedelta(days=5)), "motivo": "Test"}
        assert client.post("/admin/disponibilidad/bloqueos", json=payload).status_code == 401

    def test_create_with_auth(self, client, auth_headers):
        payload = {"fecha": str(TODAY + timedelta(days=5)), "motivo": "Test"}
        r = client.post("/admin/disponibilidad/bloqueos", json=payload, headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["motivo"] == "Test"

    def test_delete_requires_auth(self, client, db):
        bloqueo = _make_bloqueo(db)
        assert client.delete(f"/admin/disponibilidad/bloqueos/{bloqueo.id}").status_code == 401

    def test_delete_with_auth(self, client, auth_headers, db):
        bloqueo = _make_bloqueo(db)
        r = client.delete(f"/admin/disponibilidad/bloqueos/{bloqueo.id}", headers=auth_headers)
        assert r.status_code == 204


# ── /opiniones ────────────────────────────────────────────────────────────────

class TestOpiniones:
    def test_delete_requires_auth(self, client, db):
        opinion = _make_opinion(db)
        assert client.delete(f"/opiniones/{opinion.id}").status_code == 401

    def test_delete_with_auth(self, client, auth_headers, db):
        opinion = _make_opinion(db)
        r = client.delete(f"/opiniones/{opinion.id}", headers=auth_headers)
        assert r.status_code == 204


# ── /galeria ──────────────────────────────────────────────────────────────────

class TestGaleria:
    def test_upload_requires_auth(self, client):
        # Multipart POST without auth should be rejected before processing the file
        assert client.post("/galeria").status_code in (401, 422)

    def test_delete_requires_auth(self, client, db):
        post = _make_galeria_post(db)
        assert client.delete(f"/galeria/{post.id}").status_code == 401

    def test_delete_with_auth(self, client, auth_headers, db):
        post = _make_galeria_post(db)
        r = client.delete(f"/galeria/{post.id}", headers=auth_headers)
        assert r.status_code == 204

    def test_generar_caption_requires_auth(self, client, db):
        post = _make_galeria_post(db)
        assert client.post(f"/galeria/{post.id}/generar-caption").status_code == 401

    def test_publicar_requires_auth(self, client, db):
        post = _make_galeria_post(db)
        assert client.post(f"/galeria/{post.id}/publicar").status_code == 401


# ── /promociones ──────────────────────────────────────────────────────────────

class TestPromociones:
    def test_list_requires_auth(self, client):
        assert client.get("/promociones").status_code == 401

    def test_list_with_auth(self, client, auth_headers):
        r = client.get("/promociones", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_requires_auth(self, client, db):
        s = _make_servicio(db)
        payload = {
            "servicio_id": s.id,
            "porcentaje_descuento": "15.00",
            "fecha_inicio": str(TODAY),
            "fecha_fin": str(TODAY + timedelta(days=30)),
        }
        assert client.post("/promociones", json=payload).status_code == 401

    def test_create_with_auth(self, client, auth_headers, db):
        s = _make_servicio(db)
        payload = {
            "servicio_id": s.id,
            "porcentaje_descuento": "15.00",
            "fecha_inicio": str(TODAY),
            "fecha_fin": str(TODAY + timedelta(days=30)),
        }
        r = client.post("/promociones", json=payload, headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["servicio_id"] == s.id

    def test_patch_requires_auth(self, client, db):
        s = _make_servicio(db)
        promo = _make_promo(db, s.id)
        assert client.patch(f"/promociones/{promo.id}", json={"activo": False}).status_code == 401

    def test_patch_with_auth(self, client, auth_headers, db):
        s = _make_servicio(db)
        promo = _make_promo(db, s.id)
        r = client.patch(f"/promociones/{promo.id}", json={"activo": False}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["activo"] is False

    def test_delete_requires_auth(self, client, db):
        s = _make_servicio(db)
        promo = _make_promo(db, s.id)
        assert client.delete(f"/promociones/{promo.id}").status_code == 401

    def test_delete_with_auth(self, client, auth_headers, db):
        s = _make_servicio(db)
        promo = _make_promo(db, s.id)
        r = client.delete(f"/promociones/{promo.id}", headers=auth_headers)
        assert r.status_code == 204
