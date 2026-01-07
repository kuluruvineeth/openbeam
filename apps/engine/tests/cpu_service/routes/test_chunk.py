from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.cpu_service.routes.chunk import router


@pytest.fixture
def mock_chunker():
    chunker = AsyncMock()
    chunker.chunk_text = AsyncMock(
        return_value=[
            ("First chunk of text here.", 0, 25),
            ("Second chunk overlapping.", 20, 45),
        ]
    )
    return chunker


@pytest.fixture
def app(mock_chunker):
    test_app = FastAPI()
    test_app.include_router(router, prefix="/chunk")
    test_app.state.chunker = mock_chunker
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestChunkText:
    def test_chunk_success(self, client, mock_chunker):
        response = client.post(
            "/chunk",
            json={"text": "This is some long text that needs to be chunked."},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_chunks"] == 2
        assert len(data["chunks"]) == 2
        assert data["chunks"][0]["index"] == 0
        assert data["chunks"][0]["text"] == "First chunk of text here."
        assert data["chunks"][1]["index"] == 1
        assert data["chunks"][1]["text"] == "Second chunk overlapping."
        mock_chunker.chunk_text.assert_called_once()

    def test_chunk_with_custom_parameters(self, client, mock_chunker):
        response = client.post(
            "/chunk",
            json={
                "text": "Test content",
                "max_characters": 500,
                "overlap": 50,
            },
        )

        assert response.status_code == 200
        mock_chunker.chunk_text.assert_called_once_with(
            "Test content",
            max_characters=500,
            overlap=50,
        )

    def test_chunk_uses_default_parameters(self, client, mock_chunker):
        response = client.post(
            "/chunk",
            json={"text": "Some text"},
        )

        assert response.status_code == 200
        mock_chunker.chunk_text.assert_called_once_with(
            "Some text",
            max_characters=1500,
            overlap=150,
        )

    def test_chunk_total_characters_calculated(self, client, mock_chunker):
        mock_chunker.chunk_text.return_value = [
            ("AAAA", 0, 4),
            ("BBBBBB", 4, 10),
        ]

        response = client.post(
            "/chunk",
            json={"text": "Some text to chunk"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_characters"] == 10

    def test_chunk_empty_result(self, client, mock_chunker):
        mock_chunker.chunk_text.return_value = []

        response = client.post(
            "/chunk",
            json={"text": ""},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_chunks"] == 0
        assert data["chunks"] == []
        assert data["total_characters"] == 0

    def test_chunk_invalid_max_characters_too_small(self, client):
        response = client.post(
            "/chunk",
            json={
                "text": "Test",
                "max_characters": 50,
            },
        )

        assert response.status_code == 422

    def test_chunk_invalid_max_characters_too_large(self, client):
        response = client.post(
            "/chunk",
            json={
                "text": "Test",
                "max_characters": 20000,
            },
        )

        assert response.status_code == 422

    def test_chunk_invalid_overlap_negative(self, client):
        response = client.post(
            "/chunk",
            json={
                "text": "Test",
                "overlap": -1,
            },
        )

        assert response.status_code == 422

    def test_chunk_invalid_overlap_too_large(self, client):
        response = client.post(
            "/chunk",
            json={
                "text": "Test",
                "overlap": 600,
            },
        )

        assert response.status_code == 422

    def test_chunk_missing_text(self, client):
        response = client.post(
            "/chunk",
            json={},
        )

        assert response.status_code == 422
