"""Tests for /servicios endpoints."""
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
