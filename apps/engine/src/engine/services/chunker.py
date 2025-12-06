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

    def _find_split_position(self, text: str, start: int, end: int) -> int:
        search_start = max(start + (end - start) // 2, start)
        search_text = text[search_start:end]

        for sep in ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]:
            pos = search_text.rfind(sep)
            if pos != -1:
                return search_start + pos + len(sep)

        return end
