from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.cpu_service.routes.health import router


@pytest.fixture
def mock_gpu_client():
    client = MagicMock()
    client.health = AsyncMock(return_value=True)
    return client


@pytest.fixture
def mock_ltr_service():
    service = MagicMock()
    service.is_ready = True
    return service


@pytest.fixture
def app(mock_gpu_client, mock_ltr_service):
    test_app = FastAPI()
    test_app.include_router(router)
    test_app.state.gpu_client = mock_gpu_client
    test_app.state.ltr_service = mock_ltr_service
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestHealth:
    def test_health_returns_healthy(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "0.2.0"


class TestReady:
    def test_ready_all_services_healthy(
        self, client, mock_gpu_client, mock_ltr_service
    ):
        mock_gpu_client.health = AsyncMock(return_value=True)
        mock_ltr_service.is_ready = True

        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
        assert data["checks"]["cpu_service"] is True
        assert data["checks"]["gpu_service"] is True
        assert data["checks"]["ltr"] is True

    def test_ready_gpu_unhealthy(self, client, mock_gpu_client, mock_ltr_service):
        mock_gpu_client.health = AsyncMock(side_effect=ConnectionError("GPU down"))
        mock_ltr_service.is_ready = True

        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is False
        assert data["checks"]["cpu_service"] is True
        assert data["checks"]["gpu_service"] is False
        assert data["checks"]["ltr"] is True

    def test_ready_ltr_not_ready(self, client, mock_gpu_client, mock_ltr_service):
        mock_gpu_client.health = AsyncMock(return_value=True)
        mock_ltr_service.is_ready = False

        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is False
        assert data["checks"]["cpu_service"] is True
        assert data["checks"]["gpu_service"] is True
        assert data["checks"]["ltr"] is False

    def test_ready_multiple_failures(self, client, mock_gpu_client, mock_ltr_service):
        mock_gpu_client.health = AsyncMock(side_effect=Exception("connection refused"))
        mock_ltr_service.is_ready = False

        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is False
        assert data["checks"]["cpu_service"] is True
        assert data["checks"]["gpu_service"] is False
        assert data["checks"]["ltr"] is False
