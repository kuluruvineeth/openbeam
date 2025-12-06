from pathlib import Path

from unstructured.chunking.title import chunk_by_title
from unstructured.documents.elements import Text

from engine.core.logging import get_logger
from engine.models.document import DocumentElement, ParsedDocument
from engine.parsers import ParserRegistry

logger = get_logger(__name__)


class ParserService:
    async def parse(
        self, file_path: Path, mime_type: str | None = None
    ) -> ParsedDocument:
        parser = None

        if mime_type:
            parser = ParserRegistry.get_parser_for_mime(mime_type)

        if not parser:
            extension = file_path.suffix.lstrip(".").lower()
            parser = ParserRegistry.get_parser_for_extension(extension)

        if not parser:
            raise ValueError(
                f"No parser found for file: {file_path.name} (mime_type={mime_type})"
            )

        logger.debug(
            "using_parser",
            parser=parser.name,
            file=file_path.name,
            mime_type=mime_type,
        )

        return await parser.parse(file_path)

    async def chunk_elements(
        self,
        elements: list[DocumentElement],
        max_characters: int = 1500,
        overlap: int = 150,
    ) -> list[str]:
        raw_elements = [Text(text=el.text) for el in elements]

        chunks = chunk_by_title(
            raw_elements,
            max_characters=max_characters,
            overlap=overlap,
            combine_text_under_n_chars=200,
        )

        return [str(chunk) for chunk in chunks]
