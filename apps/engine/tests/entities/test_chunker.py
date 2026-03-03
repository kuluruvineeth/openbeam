from __future__ import annotations

import pytest

from engine.entities.chunker import TextChunk, chunk_text


class TestEmptyInput:
    def test_empty_string(self) -> None:
        assert chunk_text("") == []

    def test_whitespace_only(self) -> None:
        assert chunk_text("   \n\t  ") == []

    def test_none_like_empty(self) -> None:
        assert chunk_text("") == []


class TestShortText:
    def test_single_word(self) -> None:
        chunks = chunk_text("hello")
        assert len(chunks) == 1
        assert chunks[0].text == "hello"
        assert chunks[0].char_start == 0
        assert chunks[0].word_start == 0

    def test_under_max_words_returns_single_chunk(self) -> None:
        text = " ".join(f"word{i}" for i in range(50))
        chunks = chunk_text(text, max_words=300)
        assert len(chunks) == 1
        assert chunks[0].text == text

    def test_exactly_max_words_returns_single_chunk(self) -> None:
        text = " ".join(f"w{i}" for i in range(300))
        chunks = chunk_text(text, max_words=300)
        assert len(chunks) == 1


class TestChunking:
    def test_two_chunks_with_overlap(self) -> None:
        text = " ".join(f"word{i}" for i in range(400))
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        assert len(chunks) == 2
        assert chunks[0].word_start == 0
        assert chunks[0].word_end == 300
        assert chunks[1].word_start == 250
        assert chunks[1].word_end == 400

    def test_three_chunks(self) -> None:
        text = " ".join(f"w{i}" for i in range(700))
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        assert len(chunks) == 3
        assert chunks[0].word_start == 0
        assert chunks[1].word_start == 250
        assert chunks[2].word_start == 500

    def test_chunk_text_content_is_correct_slice(self) -> None:
        text = " ".join(f"word{i}" for i in range(400))
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        for chunk in chunks:
            assert chunk.text == text[chunk.char_start : chunk.char_end]

    def test_overlap_words_present_in_both_chunks(self) -> None:
        words = [f"word{i}" for i in range(400)]
        text = " ".join(words)
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        chunk0_text = chunks[0].text
        chunk1_text = chunks[1].text

        for i in range(250, 300):
            assert f"word{i}" in chunk0_text
            assert f"word{i}" in chunk1_text


class TestOffsets:
    def test_char_offsets_are_valid(self) -> None:
        text = " ".join(f"word{i}" for i in range(500))
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        for chunk in chunks:
            assert chunk.char_start >= 0
            assert chunk.char_end <= len(text)
            assert chunk.char_start < chunk.char_end

    def test_word_offsets_are_contiguous(self) -> None:
        text = " ".join(f"w{i}" for i in range(500))
        chunks = chunk_text(text, max_words=300, overlap_words=50)

        for chunk in chunks:
            assert chunk.word_start >= 0
            assert chunk.word_end > chunk.word_start


class TestEdgeCases:
    def test_hyphenated_words(self) -> None:
        text = " ".join("well-known" for _ in range(10))
        chunks = chunk_text(text, max_words=300)
        assert len(chunks) == 1

    def test_custom_max_words(self) -> None:
        text = " ".join(f"w{i}" for i in range(20))
        chunks = chunk_text(text, max_words=10, overlap_words=2)
        assert len(chunks) >= 2

    def test_overlap_equals_zero(self) -> None:
        text = " ".join(f"w{i}" for i in range(20))
        chunks = chunk_text(text, max_words=10, overlap_words=0)
        assert len(chunks) == 2
        assert chunks[0].word_end == 10
        assert chunks[1].word_start == 10


class TestTextChunkDataclass:
    def test_frozen_dataclass(self) -> None:
        chunk = TextChunk(text="hello", char_start=0, char_end=5, word_start=0, word_end=1)
        with pytest.raises(AttributeError):
            chunk.text = "world"  # type: ignore[misc]
