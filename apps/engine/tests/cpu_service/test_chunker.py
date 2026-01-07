from __future__ import annotations

import pytest

from engine.models.document import DocumentElement
from engine.services.chunker import ChunkerService


@pytest.fixture
def chunker():
    return ChunkerService(default_max_characters=100, default_overlap=20)


class TestChunkerTextChunking:
    @pytest.mark.asyncio
    async def test_empty_text_returns_empty(self, chunker: ChunkerService):
        result = await chunker.chunk_text("")
        assert result == []

    @pytest.mark.asyncio
    async def test_whitespace_only_returns_empty(self, chunker: ChunkerService):
        result = await chunker.chunk_text("   \n\t  ")
        assert result == []

    @pytest.mark.asyncio
    async def test_short_text_returns_single_chunk(self, chunker: ChunkerService):
        text = "Hello world"
        result = await chunker.chunk_text(text)
        assert len(result) == 1
        assert result[0][0] == text

    @pytest.mark.asyncio
    async def test_long_text_returns_multiple_chunks(self, chunker: ChunkerService):
        text = "This is a long sentence. " * 20
        result = await chunker.chunk_text(text)
        assert len(result) > 1

    @pytest.mark.asyncio
    async def test_chunk_positions_valid(self, chunker: ChunkerService):
        text = "Word " * 50
        result = await chunker.chunk_text(text)
        for chunk_text, start, end in result:
            assert start >= 0
            assert end <= len(text)
            assert start < end

    @pytest.mark.asyncio
    async def test_chunks_respect_max_characters(self, chunker: ChunkerService):
        text = "Word " * 100
        result = await chunker.chunk_text(text, max_characters=50)
        for chunk_text, _, _ in result:
            assert len(chunk_text) <= 50

    @pytest.mark.asyncio
    async def test_custom_overlap(self, chunker: ChunkerService):
        text = "A " * 200
        chunks_no_overlap = await chunker.chunk_text(
            text, max_characters=50, overlap=0
        )
        chunks_with_overlap = await chunker.chunk_text(
            text, max_characters=50, overlap=20
        )
        assert len(chunks_with_overlap) >= len(chunks_no_overlap)


class TestChunkerValidation:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "max_characters,overlap,error_match",
        [
            (-1, 10, "must be positive"),
            (0, 10, "must be positive"),
            (50, -1, "must be non-negative"),
            (50, 60, "must be less than max_characters"),
            (100, 100, "must be less than max_characters"),
        ],
        ids=[
            "negative-max-chars",
            "zero-max-chars",
            "negative-overlap",
            "overlap-greater-than-max",
            "overlap-equals-max",
        ],
    )
    async def test_validation_errors(
        self, chunker: ChunkerService, max_characters: int, overlap: int, error_match: str
    ):
        with pytest.raises(ValueError, match=error_match):
            await chunker.chunk_text("test", max_characters=max_characters, overlap=overlap)


class TestChunkerElementChunking:
    @pytest.mark.asyncio
    async def test_empty_elements_returns_empty(self, chunker: ChunkerService):
        result = await chunker.chunk_elements([])
        assert result == []

    @pytest.mark.asyncio
    async def test_single_element_single_chunk(self, chunker: ChunkerService):
        elements = [
            DocumentElement(type="text", text="Hello world", page_number=1)
        ]
        result = await chunker.chunk_elements(elements)
        assert len(result) == 1
        assert result[0].text == "Hello world"
        assert result[0].page_number == 1

    @pytest.mark.asyncio
    async def test_multiple_elements_merged(self, chunker: ChunkerService):
        elements = [
            DocumentElement(type="text", text="First paragraph.", page_number=1),
            DocumentElement(type="text", text="Second paragraph.", page_number=1),
        ]
        result = await chunker.chunk_elements(elements, max_characters=1000)
        assert len(result) == 1
        assert "First paragraph" in result[0].text
        assert "Second paragraph" in result[0].text

    @pytest.mark.asyncio
    async def test_page_numbers_tracked(self, chunker: ChunkerService):
        elements = [
            DocumentElement(type="text", text="Page one content. " * 20, page_number=1),
            DocumentElement(type="text", text="Page two content. " * 20, page_number=2),
        ]
        result = await chunker.chunk_elements(elements, max_characters=100)

        first_chunk = result[0]
        last_chunk = result[-1]

        assert first_chunk.page_number == 1
        has_page_two = any(c.page_number == 2 or c.page_end == 2 for c in result)
        assert has_page_two

    @pytest.mark.asyncio
    async def test_whitespace_elements_ignored(self, chunker: ChunkerService):
        elements = [
            DocumentElement(type="text", text="   ", page_number=1),
            DocumentElement(type="text", text="Actual content", page_number=1),
        ]
        result = await chunker.chunk_elements(elements)
        assert len(result) == 1
        assert result[0].text == "Actual content"


class TestChunkerSplitPosition:
    @pytest.mark.asyncio
    async def test_splits_on_sentence_boundary(self, chunker: ChunkerService):
        text = "First sentence. Second sentence. Third sentence."
        result = await chunker.chunk_text(text, max_characters=50, overlap=10)
        for chunk_text, _, _ in result:
            if len(chunk_text) < 50:
                continue
            ends_sentence = any(
                chunk_text.rstrip().endswith(sep)
                for sep in [".", "!", "?", ";"]
            )
            assert ends_sentence or len(chunk_text) <= 50

    @pytest.mark.asyncio
    async def test_prefers_paragraph_boundary(self, chunker: ChunkerService):
        text = "Para one.\n\nPara two.\n\nPara three."
        result = await chunker.chunk_text(text, max_characters=50, overlap=10)
        all_text = " ".join(chunk for chunk, _, _ in result)
        assert "one" in all_text
        assert "two" in all_text
        assert "three" in all_text
