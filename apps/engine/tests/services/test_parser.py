from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from engine.models.document import DocumentChunk, DocumentElement, ParsedDocument
from engine.services.parser import ParserService, ParserStrategy


class TestParserServiceParse:
    @pytest.fixture
    def service(self):
        return ParserService()

    @pytest.mark.asyncio
    async def test_parse_with_mime_type(self, service):
        mock_parser = MagicMock()
        mock_parser.name = "pdf_parser"
        mock_parser.parse = AsyncMock(
            return_value=ParsedDocument(elements=[], metadata={})
        )

        with patch(
            "engine.services.parser.ParserRegistry.get_parser_for_mime",
            return_value=mock_parser,
        ):
            result = await service.parse(
                Path("/test/doc.pdf"),
                mime_type="application/pdf",
            )

            assert isinstance(result, ParsedDocument)
            mock_parser.parse.assert_called_once()

    @pytest.mark.asyncio
    async def test_parse_fallback_to_extension(self, service):
        mock_parser = MagicMock()
        mock_parser.name = "txt_parser"
        mock_parser.parse = AsyncMock(
            return_value=ParsedDocument(elements=[], metadata={})
        )

        with (
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_mime",
                return_value=None,
            ),
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_extension",
                return_value=mock_parser,
            ),
        ):
            result = await service.parse(Path("/test/doc.txt"))

            assert isinstance(result, ParsedDocument)

    @pytest.mark.asyncio
    async def test_parse_no_parser_found_raises(self, service):
        with (
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_mime",
                return_value=None,
            ),
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_extension",
                return_value=None,
            ),
        ):
            with pytest.raises(ValueError) as exc_info:
                await service.parse(Path("/test/doc.xyz"), mime_type="unknown/type")

            assert "No parser found" in str(exc_info.value)
            assert "doc.xyz" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_parse_with_strategy(self, service):
        mock_parser = MagicMock()
        mock_parser.name = "test_parser"
        mock_parser.parse = AsyncMock(
            return_value=ParsedDocument(elements=[], metadata={})
        )

        with patch(
            "engine.services.parser.ParserRegistry.get_parser_for_mime",
            return_value=mock_parser,
        ):
            await service.parse(
                Path("/test/doc.pdf"),
                mime_type="application/pdf",
                strategy="hi_res",
            )

            call_kwargs = mock_parser.parse.call_args
            assert call_kwargs[1]["strategy"] == "hi_res"

    @pytest.mark.asyncio
    async def test_parse_extension_extraction(self, service):
        mock_parser = MagicMock()
        mock_parser.name = "docx_parser"
        mock_parser.parse = AsyncMock(
            return_value=ParsedDocument(elements=[], metadata={})
        )

        with (
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_mime",
                return_value=None,
            ),
            patch(
                "engine.services.parser.ParserRegistry.get_parser_for_extension"
            ) as mock_get_ext,
        ):
            mock_get_ext.return_value = mock_parser

            await service.parse(Path("/test/DOC.DOCX"))

            mock_get_ext.assert_called_once_with("docx")


class TestParserServiceChunkElements:
    @pytest.fixture
    def service(self):
        return ParserService()

    @pytest.mark.asyncio
    async def test_chunk_elements_delegates_to_chunker(self, service):
        elements = [
            DocumentElement(type="text", text="Test content", metadata={}),
        ]
        expected_chunks = [
            DocumentChunk(
                index=0,
                text="Test content",
                metadata={},
            ),
        ]

        with patch(
            "engine.services.parser.chunker_service.chunk_elements",
            new_callable=AsyncMock,
            return_value=expected_chunks,
        ) as mock_chunk:
            result = await service.chunk_elements(elements)

            assert result == expected_chunks
            mock_chunk.assert_called_once_with(
                elements,
                max_characters=1500,
                overlap=150,
            )

    @pytest.mark.asyncio
    async def test_chunk_elements_with_custom_params(self, service):
        elements = [
            DocumentElement(type="text", text="Test", metadata={}),
        ]

        with patch(
            "engine.services.parser.chunker_service.chunk_elements",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_chunk:
            await service.chunk_elements(
                elements,
                max_characters=2000,
                overlap=200,
            )

            mock_chunk.assert_called_once_with(
                elements,
                max_characters=2000,
                overlap=200,
            )


class TestParserStrategy:
    def test_strategy_type_literal(self):
        strategies: list[ParserStrategy] = ["fast", "hi_res", "ocr_only", "auto"]
        assert len(strategies) == 4
