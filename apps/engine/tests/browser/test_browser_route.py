from __future__ import annotations

from dataclasses import dataclass, field
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.cpu_service.routes.browser import router


@dataclass
class MockBrowserTaskResult:
    status: str = "completed"
    extracted_content: str = "test content"
    actions: list = field(default_factory=list)
    screenshots: list = field(default_factory=list)
    final_url: str | None = None
    error: str | None = None


@pytest.fixture
def app_without_browser():
    test_app = FastAPI()
    test_app.include_router(router)
    test_app.state.browser_service = None
    return test_app


@pytest.fixture
def client_without_browser(app_without_browser):
    return TestClient(app_without_browser)


@pytest.fixture
def mock_browser_service():
    service = AsyncMock()
    service.run_task = AsyncMock(return_value=MockBrowserTaskResult())
    return service


@pytest.fixture
def app_with_browser(mock_browser_service):
    test_app = FastAPI()
    test_app.include_router(router)
    test_app.state.browser_service = mock_browser_service
    return test_app


@pytest.fixture
def client_with_browser(app_with_browser):
    return TestClient(app_with_browser)


class TestBrowserTaskDisabled:
    def test_returns_503_when_browser_disabled(self, client_without_browser):
        response = client_without_browser.post(
            "/task",
            json={"task": "navigate to example.com"},
        )
        assert response.status_code == 503
        assert "not enabled" in response.json()["detail"]


class TestBrowserTaskValidation:
    def test_rejects_missing_task(self, client_with_browser):
        response = client_with_browser.post("/task", json={})
        assert response.status_code == 422

    def test_rejects_empty_task(self, client_with_browser):
        response = client_with_browser.post("/task", json={"task": ""})
        assert response.status_code == 422

    def test_rejects_max_steps_too_high(self, client_with_browser):
        response = client_with_browser.post(
            "/task",
            json={"task": "test", "max_steps": 200},
        )
        assert response.status_code == 422

    def test_rejects_max_steps_zero(self, client_with_browser):
        response = client_with_browser.post(
            "/task",
            json={"task": "test", "max_steps": 0},
        )
        assert response.status_code == 422


class TestBrowserTaskExecution:
    def test_successful_task(self, client_with_browser, mock_browser_service):
        response = client_with_browser.post(
            "/task",
            json={"task": "go to example.com and get the title"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["extracted_content"] == "test content"
        mock_browser_service.run_task.assert_called_once_with(
            task="go to example.com and get the title",
            start_url=None,
            max_steps=25,
        )

    def test_task_with_start_url(self, client_with_browser, mock_browser_service):
        response = client_with_browser.post(
            "/task",
            json={
                "task": "click the login button",
                "start_url": "https://example.com",
                "max_steps": 10,
            },
        )
        assert response.status_code == 200
        mock_browser_service.run_task.assert_called_once_with(
            task="click the login button",
            start_url="https://example.com",
            max_steps=10,
        )

    def test_task_with_actions(self, client_with_browser, mock_browser_service):
        from engine.browser.service import BrowserAction

        mock_browser_service.run_task.return_value = MockBrowserTaskResult(
            actions=[BrowserAction(step=1, action="click", details="clicked button")],
            final_url="https://example.com/done",
        )
        response = client_with_browser.post(
            "/task",
            json={"task": "test task"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["step"] == 1
        assert data["final_url"] == "https://example.com/done"
