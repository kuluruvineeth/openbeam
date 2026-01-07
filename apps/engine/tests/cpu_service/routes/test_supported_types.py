from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.cpu_service.routes.supported_types import router


@pytest.fixture
def mock_parser():
    parser = MagicMock()
    parser.name = "document"
    parser.supported_mimes = ["application/pdf", "text/plain"]
    parser.supported_extensions = [".pdf", ".txt"]
    return parser


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(router, prefix="/supported-types")
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestSupportedTypes:
    def test_get_supported_types(self, client, mock_parser):
        with patch(
            "engine.cpu_service.routes.supported_types.ParserRegistry"
        ) as mock_registry:
            mock_registry.all_parsers.return_value = [mock_parser]
            mock_registry.supported_mimes.return_value = [
                "application/pdf",
                "text/plain",
            ]
            mock_registry.supported_extensions.return_value = [".pdf", ".txt"]

            response = client.get("/supported-types")

            assert response.status_code == 200
            data = response.json()
            assert "application/pdf" in data["mimes"]
            assert "text/plain" in data["mimes"]
            assert ".pdf" in data["extensions"]
            assert ".txt" in data["extensions"]
            assert len(data["parsers"]) == 1
            assert data["parsers"][0]["name"] == "document"

    def test_get_supported_types_multiple_parsers(self, client, mock_parser):
        another_parser = MagicMock()
        another_parser.name = "html"
        another_parser.supported_mimes = ["text/html"]
        another_parser.supported_extensions = [".html", ".htm"]

        with patch(
            "engine.cpu_service.routes.supported_types.ParserRegistry"
        ) as mock_registry:
            mock_registry.all_parsers.return_value = [mock_parser, another_parser]
            mock_registry.supported_mimes.return_value = [
                "application/pdf",
                "text/plain",
                "text/html",
            ]
            mock_registry.supported_extensions.return_value = [
                ".pdf",
                ".txt",
                ".html",
                ".htm",
            ]

            response = client.get("/supported-types")

            assert response.status_code == 200
            data = response.json()
            assert len(data["parsers"]) == 2
            parser_names = [p["name"] for p in data["parsers"]]
            assert "document" in parser_names
            assert "html" in parser_names

    def test_get_supported_types_empty_registry(self, client):
        with patch(
            "engine.cpu_service.routes.supported_types.ParserRegistry"
        ) as mock_registry:
            mock_registry.all_parsers.return_value = []
            mock_registry.supported_mimes.return_value = []
            mock_registry.supported_extensions.return_value = []

            response = client.get("/supported-types")

            assert response.status_code == 200
            data = response.json()
            assert data["mimes"] == []
            assert data["extensions"] == []
            assert data["parsers"] == []

    def test_parser_info_structure(self, client, mock_parser):
        with patch(
            "engine.cpu_service.routes.supported_types.ParserRegistry"
        ) as mock_registry:
            mock_registry.all_parsers.return_value = [mock_parser]
            mock_registry.supported_mimes.return_value = ["application/pdf"]
            mock_registry.supported_extensions.return_value = [".pdf"]

            response = client.get("/supported-types")

            assert response.status_code == 200
            data = response.json()
            parser_info = data["parsers"][0]
            assert "name" in parser_info
            assert "mimes" in parser_info
            assert "extensions" in parser_info
            assert parser_info["mimes"] == ["application/pdf", "text/plain"]
            assert parser_info["extensions"] == [".pdf", ".txt"]
