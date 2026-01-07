from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from engine.models.document import DocumentElement, ParsedDocument
from engine.parsers.document import (
    IMAGE_EXTENSIONS,
    IMAGE_MIMES,
    TEXT_MIMES,
    DocumentParser,
)


@pytest.fixture
def parser():
    return DocumentParser()


class TestDocumentParserProperties:
    def test_name_returns_document(self, parser: DocumentParser):
        assert parser.name == "document"

    def test_supported_mimes_contains_pdf(self, parser: DocumentParser):
        assert "application/pdf" in parser.supported_mimes

    def test_supported_mimes_contains_word(self, parser: DocumentParser):
        assert "application/msword" in parser.supported_mimes
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in parser.supported_mimes
        )

    def test_supported_mimes_contains_images(self, parser: DocumentParser):
        for mime in IMAGE_MIMES:
            assert mime in parser.supported_mimes

    def test_supported_mimes_contains_text(self, parser: DocumentParser):
        for mime in TEXT_MIMES:
            assert mime in parser.supported_mimes

    def test_supported_extensions_contains_pdf(self, parser: DocumentParser):
        assert "pdf" in parser.supported_extensions

    def test_supported_extensions_contains_doc(self, parser: DocumentParser):
        assert "doc" in parser.supported_extensions
        assert "docx" in parser.supported_extensions

    def test_supported_extensions_contains_images(self, parser: DocumentParser):
        for ext in IMAGE_EXTENSIONS:
            assert ext in parser.supported_extensions


class TestGetOptimalStrategy:
    def test_image_mime_returns_hi_res(self, parser: DocumentParser):
        for mime in IMAGE_MIMES:
            result = parser.get_optimal_strategy(mime, Path("test.png"))
            assert result == "hi_res"

    def test_text_mime_returns_fast(self, parser: DocumentParser):
        for mime in TEXT_MIMES:
            result = parser.get_optimal_strategy(mime, Path("test.txt"))
            assert result == "fast"

    def test_pdf_mime_returns_auto(self, parser: DocumentParser):
        result = parser.get_optimal_strategy("application/pdf", Path("test.pdf"))
        assert result == "auto"

    def test_image_extension_returns_hi_res(self, parser: DocumentParser):
        for ext in IMAGE_EXTENSIONS:
            result = parser.get_optimal_strategy(None, Path(f"test.{ext}"))
            assert result == "hi_res"

    def test_unknown_extension_returns_auto(self, parser: DocumentParser):
        result = parser.get_optimal_strategy(None, Path("test.unknown"))
        assert result == "auto"

    def test_mime_takes_precedence_over_extension(self, parser: DocumentParser):
        result = parser.get_optimal_strategy("text/plain", Path("test.png"))
        assert result == "fast"


class TestParse:
    @pytest.mark.asyncio
    async def test_parse_calls_partition(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "NarrativeText"
        mock_element.__str__ = MagicMock(return_value="Test content")
        mock_element.metadata = MagicMock()
        mock_element.metadata.to_dict = MagicMock(return_value={})
        mock_element.metadata.page_number = 1

        with patch(
            "engine.parsers.document.partition", return_value=[mock_element]
        ) as mock_partition:
            result = await parser.parse(Path("/tmp/test.pdf"), "application/pdf")

            mock_partition.assert_called_once()
            call_kwargs = mock_partition.call_args[1]
            assert call_kwargs["filename"] == "/tmp/test.pdf"
            assert call_kwargs["strategy"] == "auto"
            assert call_kwargs["include_page_breaks"] is True

    @pytest.mark.asyncio
    async def test_parse_returns_parsed_document(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "NarrativeText"
        mock_element.__str__ = MagicMock(return_value="Test content")
        mock_element.metadata = MagicMock()
        mock_element.metadata.to_dict = MagicMock(return_value={})
        mock_element.metadata.page_number = 1
        mock_element.metadata.filename = "test.pdf"
        mock_element.metadata.filetype = "application/pdf"
        mock_element.metadata.languages = None

        with patch(
            "engine.parsers.document.partition", return_value=[mock_element]
        ):
            result = await parser.parse(Path("/tmp/test.pdf"))

            assert isinstance(result, ParsedDocument)
            assert len(result.elements) == 1
            assert result.elements[0].text == "Test content"
            assert result.elements[0].type == "NarrativeText"

    @pytest.mark.asyncio
    async def test_parse_with_explicit_strategy(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "Title"
        mock_element.__str__ = MagicMock(return_value="Document Title")
        mock_element.metadata = MagicMock()
        mock_element.metadata.to_dict = MagicMock(return_value={})
        mock_element.metadata.page_number = None

        with patch(
            "engine.parsers.document.partition", return_value=[mock_element]
        ) as mock_partition:
            await parser.parse(Path("/tmp/test.pdf"), strategy="hi_res")

            call_kwargs = mock_partition.call_args[1]
            assert call_kwargs["strategy"] == "hi_res"

    @pytest.mark.asyncio
    async def test_parse_calculates_text_length(self, parser: DocumentParser):
        mock_elements = []
        for text in ["Hello", "World", "Test"]:
            el = MagicMock()
            el.category = "NarrativeText"
            el.__str__ = MagicMock(return_value=text)
            el.metadata = MagicMock()
            el.metadata.to_dict = MagicMock(return_value={})
            el.metadata.page_number = None
            mock_elements.append(el)

        with patch(
            "engine.parsers.document.partition", return_value=mock_elements
        ):
            result = await parser.parse(Path("/tmp/test.txt"))

            expected_length = len("Hello") + len("World") + len("Test")
            assert result.text_length == expected_length

    @pytest.mark.asyncio
    async def test_parse_tracks_page_count(self, parser: DocumentParser):
        mock_elements = []
        for page in [1, 1, 2, 3, 3]:
            el = MagicMock()
            el.category = "NarrativeText"
            el.__str__ = MagicMock(return_value=f"Page {page}")
            el.metadata = MagicMock()
            el.metadata.to_dict = MagicMock(return_value={})
            el.metadata.page_number = page
            mock_elements.append(el)

        with patch(
            "engine.parsers.document.partition", return_value=mock_elements
        ):
            result = await parser.parse(Path("/tmp/test.pdf"))

            assert result.page_count == 3

    @pytest.mark.asyncio
    async def test_parse_empty_document(self, parser: DocumentParser):
        with patch("engine.parsers.document.partition", return_value=[]):
            result = await parser.parse(Path("/tmp/empty.txt"))

            assert result.elements == []
            assert result.text_length == 0
            assert result.page_count is None


class TestConvertElement:
    def test_convert_element_basic(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "NarrativeText"
        mock_element.__str__ = MagicMock(return_value="Test content")
        mock_element.metadata = MagicMock()
        mock_element.metadata.to_dict = MagicMock(return_value={"key": "value"})
        mock_element.metadata.page_number = 5

        result = parser._convert_element(mock_element)

        assert isinstance(result, DocumentElement)
        assert result.type == "NarrativeText"
        assert result.text == "Test content"
        assert result.metadata == {"key": "value"}
        assert result.page_number == 5

    def test_convert_element_no_metadata(self, parser: DocumentParser):
        mock_element = MagicMock(spec=["category", "__str__"])
        mock_element.category = "Title"
        mock_element.__str__ = MagicMock(return_value="Title Text")
        del mock_element.metadata

        result = parser._convert_element(mock_element)

        assert result.type == "Title"
        assert result.text == "Title Text"
        assert result.metadata == {}
        assert result.page_number is None

    def test_convert_element_metadata_to_dict_fails(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "NarrativeText"
        mock_element.__str__ = MagicMock(return_value="Content")
        mock_element.metadata = MagicMock()
        mock_element.metadata.to_dict = MagicMock(side_effect=Exception("Failed"))
        mock_element.metadata.page_number = 1

        result = parser._convert_element(mock_element)

        assert result.metadata == {}
        assert result.page_number == 1

    def test_convert_element_no_page_number_attr(self, parser: DocumentParser):
        mock_element = MagicMock()
        mock_element.category = "NarrativeText"
        mock_element.__str__ = MagicMock(return_value="Content")
        mock_element.metadata = MagicMock(spec=["to_dict"])
        mock_element.metadata.to_dict = MagicMock(return_value={})

        result = parser._convert_element(mock_element)

        assert result.page_number is None


class TestExtractMetadata:
    def test_extract_metadata_element_count(self, parser: DocumentParser):
        mock_elements = [MagicMock(category="Title"), MagicMock(category="NarrativeText")]
        for el in mock_elements:
            del el.metadata

        result = parser._extract_metadata(mock_elements)

        assert result["element_count"] == 2

    def test_extract_metadata_element_types(self, parser: DocumentParser):
        mock_elements = [
            MagicMock(category="Title"),
            MagicMock(category="NarrativeText"),
            MagicMock(category="NarrativeText"),
        ]
        for el in mock_elements:
            del el.metadata

        result = parser._extract_metadata(mock_elements)

        assert result["element_types"]["Title"] == 1
        assert result["element_types"]["NarrativeText"] == 2

    def test_extract_metadata_filename(self, parser: DocumentParser):
        mock_element = MagicMock(category="Title")
        mock_element.metadata = MagicMock()
        mock_element.metadata.filename = "document.pdf"
        mock_element.metadata.filetype = None
        mock_element.metadata.languages = None

        result = parser._extract_metadata([mock_element])

        assert result["filename"] == "document.pdf"

    def test_extract_metadata_filetype(self, parser: DocumentParser):
        mock_element = MagicMock(category="Title")
        mock_element.metadata = MagicMock()
        mock_element.metadata.filename = None
        mock_element.metadata.filetype = "application/pdf"
        mock_element.metadata.languages = None

        result = parser._extract_metadata([mock_element])

        assert result["filetype"] == "application/pdf"

    def test_extract_metadata_languages(self, parser: DocumentParser):
        mock_element = MagicMock(category="Title")
        mock_element.metadata = MagicMock()
        mock_element.metadata.filename = None
        mock_element.metadata.filetype = None
        mock_element.metadata.languages = ["en", "es"]

        result = parser._extract_metadata([mock_element])

        assert result["languages"] == ["en", "es"]

    def test_extract_metadata_empty_elements(self, parser: DocumentParser):
        result = parser._extract_metadata([])

        assert result["element_count"] == 0
        assert result["element_types"] == {}


class TestCanParse:
    @pytest.mark.asyncio
    async def test_can_parse_by_mime_type(self, parser: DocumentParser):
        assert await parser.can_parse(Path("test"), "application/pdf") is True
        assert await parser.can_parse(Path("test"), "image/png") is True
        assert await parser.can_parse(Path("test"), "text/plain") is True

    @pytest.mark.asyncio
    async def test_can_parse_by_extension(self, parser: DocumentParser):
        assert await parser.can_parse(Path("test.pdf")) is True
        assert await parser.can_parse(Path("test.docx")) is True
        assert await parser.can_parse(Path("test.png")) is True

    @pytest.mark.asyncio
    async def test_cannot_parse_unsupported(self, parser: DocumentParser):
        assert await parser.can_parse(Path("test.xyz")) is False
        assert await parser.can_parse(Path("test"), "application/unknown") is False


class TestConstants:
    def test_image_mimes_frozenset(self):
        assert isinstance(IMAGE_MIMES, frozenset)
        assert "image/png" in IMAGE_MIMES
        assert "image/jpeg" in IMAGE_MIMES

    def test_text_mimes_frozenset(self):
        assert isinstance(TEXT_MIMES, frozenset)
        assert "text/plain" in TEXT_MIMES
        assert "application/json" in TEXT_MIMES

    def test_image_extensions_frozenset(self):
        assert isinstance(IMAGE_EXTENSIONS, frozenset)
        assert "png" in IMAGE_EXTENSIONS
        assert "jpg" in IMAGE_EXTENSIONS
        assert "jpeg" in IMAGE_EXTENSIONS
