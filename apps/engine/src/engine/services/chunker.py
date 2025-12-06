from engine.models.document import DocumentChunk, DocumentElement


class ChunkerService:
    async def chunk_text(
        self,
        text: str,
        max_characters: int = 1500,
        overlap: int = 150,
    ) -> list[str]:
        if len(text) <= max_characters:
            return [text] if text.strip() else []

        chunks: list[str] = []
        start = 0

        while start < len(text):
            end = start + max_characters

            if end >= len(text):
                chunks.append(text[start:].strip())
                break

            split_pos = self._find_split_position(text, start, end)
            chunks.append(text[start:split_pos].strip())

            start = split_pos - overlap
            if start < 0:
                start = 0

            if start >= len(text) - 1:
                break

        return [c for c in chunks if c]

    async def chunk_elements(
        self,
        elements: list[DocumentElement],
        max_characters: int = 1500,
        overlap: int = 150,
    ) -> list[DocumentChunk]:
        if not elements:
            return []

        text_parts: list[tuple[str, int | None]] = []  # (text, page_number)
        for el in elements:
            if el.text.strip():
                text_parts.append((el.text, el.page_number))

        if not text_parts:
            return []

        full_text = ""
        page_map: list[tuple[int, int, int | None]] = []  # (start, end, page)

        for text, page in text_parts:
            start = len(full_text)
            full_text += text + "\n\n"
            end = len(full_text)
            page_map.append((start, end, page))

        if not full_text.strip():
            return []

        string_chunks = await self.chunk_text(full_text, max_characters, overlap)

        result: list[DocumentChunk] = []
        current_pos = 0

        for idx, chunk_text in enumerate(string_chunks):
            chunk_start = full_text.find(chunk_text, current_pos)
            if chunk_start == -1:
                chunk_start = current_pos
            chunk_end = chunk_start + len(chunk_text)
            current_pos = max(chunk_start + 1, chunk_end - overlap)

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
        search_start = max(start + (end - start) // 2, start)
        search_text = text[search_start:end]

        for sep in ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]:
            pos = search_text.rfind(sep)
            if pos != -1:
                return search_start + pos + len(sep)

        return end
