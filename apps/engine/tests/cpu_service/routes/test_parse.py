from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
import respx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import Response

from engine.cpu_service.routes.parse import router
from engine.models.document import DocumentChunk, DocumentElement, ParsedDocument


@pytest.fixture
def mock_chunker():
    chunker = AsyncMock()
    chunker.chunk_elements = AsyncMock(
        return_value=[
            DocumentChunk(index=0, text="chunk 1", metadata={}),
            DocumentChunk(index=1, text="chunk 2", metadata={}),
        ]
    )
    return chunker


@pytest.fixture
def app(mock_chunker):
    test_app = FastAPI()
    test_app.include_router(router, prefix="/parse")
    test_app.state.chunker = mock_chunker
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def mock_parsed_document():
    return ParsedDocument(
        elements=[
            DocumentElement(type="Title", text="Test Document"),
            DocumentElement(type="Text", text="This is test content."),
        ],
        metadata={"filename": "test.pdf"},
        page_count=1,
        text_length=35,
    )


class TestParseDocument:
    def test_parse_success_with_chunking(
        self, client, mock_chunker, mock_parsed_document
    ):
        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            file_content = b"test file content"
            response = client.post(
                "/parse",
                files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")},
                params={"chunk": True, "max_chunk_size": 1500, "overlap": 150},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "test.pdf"
            assert data["mime_type"] == "application/pdf"
            assert len(data["elements"]) == 2
            assert data["chunks"] is not None
            assert len(data["chunks"]) == 2
            assert data["text_length"] == 35
            assert data["page_count"] == 1

    def test_parse_success_without_chunking(self, client, mock_parsed_document):
        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            file_content = b"test file content"
            response = client.post(
                "/parse",
                files={"file": ("test.txt", io.BytesIO(file_content), "text/plain")},
                params={"chunk": False},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "test.txt"
            assert data["chunks"] is None

    def test_parse_no_filename_returns_error(self, client):
        file_content = b"test file content"
        response = client.post(
            "/parse",
            files={"file": ("", io.BytesIO(file_content), "application/pdf")},
        )

        assert response.status_code == 422

    def test_parse_file_too_large_returns_413(self, client):
        with patch("engine.cpu_service.routes.parse.get_cpu_settings") as mock_settings:
            mock_settings.return_value.max_file_size_mb = 0.0001

            large_content = b"x" * 1024
            response = client.post(
                "/parse",
                files={
                    "file": ("large.pdf", io.BytesIO(large_content), "application/pdf")
                },
            )

            assert response.status_code == 413
            assert "File too large" in response.json()["detail"]

    def test_parse_error_returns_500(self, client):
        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(
                side_effect=ValueError("Parse failed")
            )

            file_content = b"test file content"
            response = client.post(
                "/parse",
                files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")},
            )

            assert response.status_code == 500
            assert "Parse failed" in response.json()["detail"]

    def test_parse_with_strategy(self, client, mock_parsed_document):
        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            file_content = b"test file content"
            response = client.post(
                "/parse",
                files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")},
                params={"chunk": False, "strategy": "ocr_only"},
            )

            assert response.status_code == 200
            mock_parser_service.parse.assert_called_once()
            call_kwargs = mock_parser_service.parse.call_args
            assert call_kwargs.kwargs["strategy"] == "ocr_only"

    def test_parse_no_elements_skips_chunking(self, client, mock_chunker):
        empty_doc = ParsedDocument(
            elements=[],
            metadata={},
            page_count=0,
            text_length=0,
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=empty_doc)

            file_content = b"empty"
            response = client.post(
                "/parse",
                files={"file": ("empty.txt", io.BytesIO(file_content), "text/plain")},
                params={"chunk": True},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["elements"] == []
            assert data["chunks"] is None
            mock_chunker.chunk_elements.assert_not_called()


class TestParseFromUrl:
    @respx.mock
    def test_parse_url_success(self, client, mock_chunker, mock_parsed_document):
        respx.get("https://example.com/doc.pdf").mock(
            return_value=Response(
                200,
                content=b"pdf content",
                headers={"content-type": "application/pdf"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/doc.pdf"},
                params={"chunk": True},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "doc.pdf"
            assert data["mime_type"] == "application/pdf"
            assert data["chunks"] is not None

    @respx.mock
    def test_parse_url_with_custom_filename(self, client, mock_parsed_document):
        respx.get("https://example.com/abc123").mock(
            return_value=Response(
                200,
                content=b"content",
                headers={"content-type": "text/plain"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/abc123", "filename": "custom.txt"},
                params={"chunk": False},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "custom.txt"

    @respx.mock
    def test_parse_url_fetch_error_returns_400(self, client):
        respx.get("https://example.com/notfound.pdf").mock(
            return_value=Response(404, text="Not Found")
        )

        response = client.post(
            "/parse/url",
            json={"url": "https://example.com/notfound.pdf"},
        )

        assert response.status_code == 400
        assert "Failed to fetch URL" in response.json()["detail"]

    @respx.mock
    def test_parse_url_parse_error_returns_500(self, client):
        respx.get("https://example.com/doc.pdf").mock(
            return_value=Response(
                200,
                content=b"pdf content",
                headers={"content-type": "application/pdf"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(
                side_effect=RuntimeError("Parse error")
            )

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/doc.pdf"},
            )

            assert response.status_code == 500
            assert "Parse error" in response.json()["detail"]

    @respx.mock
    def test_parse_url_with_strategy_from_body(self, client, mock_parsed_document):
        respx.get("https://example.com/doc.pdf").mock(
            return_value=Response(
                200,
                content=b"pdf content",
                headers={"content-type": "application/pdf"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={
                    "url": "https://example.com/doc.pdf",
                    "strategy": "hi_res",
                },
                params={"chunk": False},
            )

            assert response.status_code == 200
            call_kwargs = mock_parser_service.parse.call_args
            assert call_kwargs.kwargs["strategy"] == "hi_res"

    @respx.mock
    def test_parse_url_extracts_filename_from_url(self, client, mock_parsed_document):
        respx.get("https://example.com/path/to/document.docx?token=abc").mock(
            return_value=Response(
                200,
                content=b"docx content",
                headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/path/to/document.docx?token=abc"},
                params={"chunk": False},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "document.docx"

    @respx.mock
    def test_parse_url_content_type_without_charset(self, client, mock_parsed_document):
        respx.get("https://example.com/doc.html").mock(
            return_value=Response(
                200,
                content=b"<html></html>",
                headers={"content-type": "text/html; charset=utf-8"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/doc.html"},
                params={"chunk": False},
            )

            assert response.status_code == 200
            call_kwargs = mock_parser_service.parse.call_args
            assert call_kwargs.kwargs["mime_type"] == "text/html"

    @respx.mock
    def test_parse_url_no_extension_uses_bin(self, client, mock_parsed_document):
        respx.get("https://example.com/data").mock(
            return_value=Response(
                200,
                content=b"binary data",
                headers={"content-type": "application/octet-stream"},
            )
        )

        with patch(
            "engine.cpu_service.routes.parse.parser_service"
        ) as mock_parser_service:
            mock_parser_service.parse = AsyncMock(return_value=mock_parsed_document)

            response = client.post(
                "/parse/url",
                json={"url": "https://example.com/data"},
                params={"chunk": False},
            )

            assert response.status_code == 200
