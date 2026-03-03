from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TextChunk:
    text: str
    char_start: int
    char_end: int
    word_start: int
    word_end: int


_WORD_PATTERN = re.compile(r"\w+(?:[-_]\w+)*|\S")


def chunk_text(
    text: str,
    max_words: int = 300,
    overlap_words: int = 50,
) -> list[TextChunk]:
    if not text or not text.strip():
        return []

    words = list(_WORD_PATTERN.finditer(text))
    if not words:
        return []

    if len(words) <= max_words:
        return [
            TextChunk(
                text=text,
                char_start=0,
                char_end=len(text),
                word_start=0,
                word_end=len(words),
            )
        ]

    chunks: list[TextChunk] = []
    step = max_words - overlap_words
    i = 0

    while i < len(words):
        end_idx = min(i + max_words, len(words))
        char_start = words[i].start()
        char_end = words[end_idx - 1].end()

        chunks.append(
            TextChunk(
                text=text[char_start:char_end],
                char_start=char_start,
                char_end=char_end,
                word_start=i,
                word_end=end_idx,
            )
        )

        if end_idx >= len(words):
            break
        i += step

    return chunks
