from __future__ import annotations

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from engine.common.security.headers import SecurityHeadersMiddleware


class TestSecurityHeadersMiddleware:
    @pytest.fixture
    def app(self):
        app = FastAPI()
        app.add_middleware(SecurityHeadersMiddleware)

        @app.get("/")
        def root():
            return {"status": "ok"}

        @app.post("/data")
        def data():
            return {"received": True}

        return app

    @pytest.fixture
    def client(self, app):
        return TestClient(app)

    def test_x_content_type_options(self, client):
        response = client.get("/")
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_x_frame_options(self, client):
        response = client.get("/")
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_xss_protection(self, client):
        response = client.get("/")
        assert response.headers["X-XSS-Protection"] == "0"

    def test_referrer_policy(self, client):
        response = client.get("/")
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_content_security_policy(self, client):
        response = client.get("/")
        csp = response.headers["Content-Security-Policy"]
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp

    def test_cache_control(self, client):
        response = client.get("/")
        cache = response.headers["Cache-Control"]
        assert "no-store" in cache
        assert "no-cache" in cache
        assert "private" in cache

    def test_permissions_policy(self, client):
        response = client.get("/")
        policy = response.headers["Permissions-Policy"]
        assert "camera=()" in policy
        assert "microphone=()" in policy
        assert "geolocation=()" in policy

    def test_headers_on_post(self, client):
        response = client.post("/data")
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_all_security_headers_present(self, client):
        response = client.get("/")
        expected_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Content-Security-Policy",
            "Cache-Control",
            "Permissions-Policy",
        ]
        for header in expected_headers:
            assert header in response.headers
