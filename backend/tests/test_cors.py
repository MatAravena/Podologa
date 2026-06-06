"""CORS preflight behaviour for the production (Vercel) frontend."""


class TestCors:
    def _preflight(self, client, origin: str):
        return client.options(
            "/opiniones",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

    def test_allows_vercel_production_origin(self, client):
        resp = self._preflight(client, "https://podologa.vercel.app")
        assert resp.headers.get("access-control-allow-origin") == "https://podologa.vercel.app"

    def test_allows_vercel_preview_origin(self, client):
        origin = "https://podologa-git-main-mataravena.vercel.app"
        resp = self._preflight(client, origin)
        assert resp.headers.get("access-control-allow-origin") == origin

    def test_allows_localhost_dev_origin(self, client):
        resp = self._preflight(client, "http://localhost:4200")
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:4200"

    def test_blocks_unknown_origin(self, client):
        resp = self._preflight(client, "https://evil.example.com")
        assert "access-control-allow-origin" not in resp.headers

    def test_get_method_is_allowed(self, client):
        resp = self._preflight(client, "https://podologa.vercel.app")
        allowed = resp.headers.get("access-control-allow-methods", "")
        assert "GET" in allowed
