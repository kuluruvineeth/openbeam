from __future__ import annotations

import uuid

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from engine.common.security.request_id import (
    REQUEST_ID_HEADER,
    RequestIDMiddleware,
    get_request_id,
)


class TestGetRequestId:
    def test_returns_empty_string_by_default(self):
        result = get_request_id()
        assert result == ""


class TestRequestIdHeader:
    def test_header_name(self):
        assert REQUEST_ID_HEADER == "X-Request-ID"


class TestRequestIDMiddleware:
    @pytest.fixture
    def app(self):
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/")
        def root():
            return {"request_id": get_request_id()}

        @app.get("/state")
        def state(request):
            return {"state_id": request.state.request_id}

        return app

    @pytest.fixture
    def client(self, app):
        return TestClient(app)

    def test_generates_request_id(self, client):
        response = client.get("/")
        assert REQUEST_ID_HEADER in response.headers
        uuid.UUID(response.headers[REQUEST_ID_HEADER], version=4)

    def test_propagates_valid_request_id(self, client):
        incoming_id = str(uuid.uuid4())
        response = client.get("/", headers={REQUEST_ID_HEADER: incoming_id})
        assert response.headers[REQUEST_ID_HEADER] == incoming_id

    def test_replaces_invalid_request_id(self, client):
        response = client.get("/", headers={REQUEST_ID_HEADER: "invalid-uuid"})
        returned_id = response.headers[REQUEST_ID_HEADER]
        assert returned_id != "invalid-uuid"
        uuid.UUID(returned_id, version=4)

    def test_replaces_empty_request_id(self, client):
        response = client.get("/", headers={REQUEST_ID_HEADER: ""})
        returned_id = response.headers[REQUEST_ID_HEADER]
        uuid.UUID(returned_id, version=4)

    def test_context_accessible_in_handler(self, client):
        response = client.get("/")
        data = response.json()
        assert data["request_id"] == response.headers[REQUEST_ID_HEADER]

    def test_multiple_requests_unique_ids(self, client):
        ids = set()
        for _ in range(10):
            response = client.get("/")
            ids.add(response.headers[REQUEST_ID_HEADER])
        assert len(ids) == 10
