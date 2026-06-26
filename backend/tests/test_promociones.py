"""Tests for /promociones endpoints."""
from datetime import date, timedelta

from models import Promocion, Servicio


def _future(days: int) -> date:
    return date.today() + timedelta(days=days)


def _past(days: int) -> date:
    return date.today() - timedelta(days=days)


def _seed_servicio(db) -> Servicio:
    s = Servicio(nombre="Podología", descripcion=None, duracion=60, precio="30000")
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _seed_promo(db, servicio_id: int, dias_inicio: int = -1, dias_fin: int = 10, descuento: int = 20) -> Promocion:
    p = Promocion(
        servicio_id=servicio_id,
        porcentaje_descuento=descuento,
        descripcion="Promo test",
        fecha_inicio=_future(dias_inicio) if dias_inicio > 0 else _past(-dias_inicio),
        fecha_fin=_future(dias_fin),
        activo=True,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


class TestVigentes:
    def test_returns_empty_when_no_promos(self, client):
        resp = client.get("/promociones/vigentes")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_active_promo(self, client, db):
        s = _seed_servicio(db)
        _seed_promo(db, s.id)

        resp = client.get("/promociones/vigentes")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["porcentaje_descuento"] == 20

    def test_does_not_return_future_promo(self, client, db):
        s = _seed_servicio(db)
        # starts 5 days from now
        _seed_promo(db, s.id, dias_inicio=5, dias_fin=10)

        resp = client.get("/promociones/vigentes")
        assert resp.json() == []

    def test_does_not_return_expired_promo(self, client, db):
        s = _seed_servicio(db)
        p = Promocion(
            servicio_id=s.id,
            porcentaje_descuento=15,
            fecha_inicio=_past(10),
            fecha_fin=_past(1),  # ended yesterday
            activo=True,
        )
        db.add(p)
        db.commit()

        resp = client.get("/promociones/vigentes")
        assert resp.json() == []

    def test_does_not_return_inactive_promo(self, client, db):
        s = _seed_servicio(db)
        p = Promocion(
            servicio_id=s.id,
            porcentaje_descuento=20,
            fecha_inicio=_past(1),
            fecha_fin=_future(10),
            activo=False,
        )
        db.add(p)
        db.commit()

        resp = client.get("/promociones/vigentes")
        assert resp.json() == []

    def test_filter_by_servicio_id(self, client, db):
        s1 = _seed_servicio(db)
        s2 = Servicio(nombre="Reiki", descripcion=None, duracion=60, precio="25000")
        db.add(s2)
        db.commit()
        db.refresh(s2)

        _seed_promo(db, s1.id)
        _seed_promo(db, s2.id)

        resp = client.get(f"/promociones/vigentes?servicio_id={s1.id}")
        assert len(resp.json()) == 1
        assert resp.json()[0]["servicio_id"] == s1.id


class TestAdminPromos:
    def test_list_requires_auth(self, client):
        resp = client.get("/promociones")
        assert resp.status_code == 401

    def test_admin_can_list_all(self, client, db, auth_headers):
        s = _seed_servicio(db)
        _seed_promo(db, s.id)
        resp = client.get("/promociones", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_admin_can_create(self, client, db, auth_headers):
        s = _seed_servicio(db)
        payload = {
            "servicio_id": s.id,
            "porcentaje_descuento": 30,
            "descripcion": "Promo de prueba",
            "fecha_inicio": str(_past(1)),
            "fecha_fin": str(_future(30)),
        }
        resp = client.post("/promociones", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["porcentaje_descuento"] == 30

    def test_create_requires_auth(self, client, db):
        s = _seed_servicio(db)
        payload = {
            "servicio_id": s.id,
            "porcentaje_descuento": 10,
            "fecha_inicio": str(date.today()),
            "fecha_fin": str(_future(5)),
        }
        resp = client.post("/promociones", json=payload)
        assert resp.status_code == 401

    def test_fecha_fin_before_inicio_rejected(self, client, db, auth_headers):
        s = _seed_servicio(db)
        payload = {
            "servicio_id": s.id,
            "porcentaje_descuento": 10,
            "fecha_inicio": str(_future(10)),
            "fecha_fin": str(_future(5)),  # before inicio!
        }
        resp = client.post("/promociones", json=payload, headers=auth_headers)
        assert resp.status_code == 422

    def test_admin_can_update(self, client, db, auth_headers):
        s = _seed_servicio(db)
        promo = _seed_promo(db, s.id)

        resp = client.patch(
            f"/promociones/{promo.id}",
            json={"porcentaje_descuento": 50},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["porcentaje_descuento"] == 50

    def test_admin_can_delete(self, client, db, auth_headers):
        s = _seed_servicio(db)
        promo = _seed_promo(db, s.id)

        resp = client.delete(f"/promociones/{promo.id}", headers=auth_headers)
        assert resp.status_code == 204

        # Should no longer appear in vigentes
        assert client.get("/promociones/vigentes").json() == []

    def test_update_nonexistent_returns_404(self, client, auth_headers):
        resp = client.patch("/promociones/9999", json={"activo": False}, headers=auth_headers)
        assert resp.status_code == 404
