from engine.models.document import DocumentChunk, DocumentElement


class ChunkerService:
    def __init__(
        self,
        default_max_characters: int = 1500,
        default_overlap: int = 150,
    ) -> None:
        self._default_max_characters = default_max_characters
        self._default_overlap = default_overlap

    def _validate_params(self, max_characters: int, overlap: int) -> None:
        if max_characters <= 0:
            raise ValueError("max_characters must be positive")
        if overlap < 0:
            raise ValueError("overlap must be non-negative")
        if overlap >= max_characters:
            raise ValueError("overlap must be less than max_characters")
        if max_characters < overlap * 2:
            raise ValueError(
                f"max_characters ({max_characters}) must be at least "
                f"2x overlap ({overlap}) to guarantee forward progress"
            )

    async def chunk_text(
        self,
        text: str,
        max_characters: int | None = None,
        overlap: int | None = None,
    ) -> list[tuple[str, int, int]]:
        """
        Returns list of (chunk_text, start_position, end_position) tuples.
        Positions are relative to the original text before stripping.
        """
        if max_characters is None:
            max_characters = self._default_max_characters
        if overlap is None:
            overlap = self._default_overlap

        self._validate_params(max_characters, overlap)

        if not text or not text.strip():
            return []

        if len(text) <= max_characters:
            stripped = text.strip()
            if not stripped:
                return []
            start_offset = text.index(stripped[0])
            return [(stripped, start_offset, start_offset + len(stripped))]

        chunks: list[tuple[str, int, int]] = []
        start = 0
        text_len = len(text)
        min_advance = max_characters - overlap

        while start < text_len:
            end = min(start + max_characters, text_len)

            if end >= text_len:
                chunk = text[start:].strip()
                if chunk:
                    chunks.append((chunk, start, text_len))
                break

            split_pos = self._find_split_position(text, start, end)

            chunk = text[start:split_pos].strip()
            if chunk:
                chunks.append((chunk, start, split_pos))

            next_start = max(split_pos - overlap, start + min_advance)
            if next_start <= start:
                next_start = start + min_advance

            start = next_start

        return chunks

    async def chunk_elements(
        self,
        elements: list[DocumentElement],
        max_characters: int | None = None,
        overlap: int | None = None,
    ) -> list[DocumentChunk]:
        if max_characters is None:
            max_characters = self._default_max_characters
        if overlap is None:
            overlap = self._default_overlap

        self._validate_params(max_characters, overlap)

        if not elements:
            return []

        text_parts: list[tuple[str, int | None]] = []
        for el in elements:
            if el.text.strip():
                text_parts.append((el.text, el.page_number))

        if not text_parts:
            return []

        full_text = ""
        page_map: list[tuple[int, int, int | None]] = []

        for part_text, page in text_parts:
            seg_start = len(full_text)
            full_text += part_text + "\n\n"
            seg_end = len(full_text)
            page_map.append((seg_start, seg_end, page))

        if not full_text.strip():
            return []

        chunk_tuples = await self.chunk_text(full_text, max_characters, overlap)

        result: list[DocumentChunk] = []

        for idx, (chunk_text, chunk_start, chunk_end) in enumerate(chunk_tuples):
            start_page: int | None = None
            end_page: int | None = None

            for seg_start, seg_end, page in page_map:
                overlaps = chunk_start < seg_end and chunk_end > seg_start
                if overlaps and page is not None:
                    if start_page is None:
                        start_page = page
                    end_page = page

            result.append(
                DocumentChunk(
                    index=idx,
                    text=chunk_text,
                    page_number=start_page,
                    page_end=end_page if end_page != start_page else None,
                )
            )

        return result

    def _find_split_position(self, text: str, start: int, end: int) -> int:
        search_start = start + (end - start) // 2
        search_text = text[search_start:end]

        for sep in ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]:
            pos = search_text.rfind(sep)
            if pos != -1:
                return search_start + pos + len(sep)

        return end
