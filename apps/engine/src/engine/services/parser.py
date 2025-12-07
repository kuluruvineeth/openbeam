from pathlib import Path
from typing import Literal

from engine.core.logging import get_logger
from engine.models.document import DocumentChunk, DocumentElement, ParsedDocument
from engine.parsers import ParserRegistry
from engine.services.chunker import ChunkerService

logger = get_logger(__name__)

chunker_service = ChunkerService()

ParserStrategy = Literal["fast", "hi_res", "ocr_only", "auto"]


class ParserService:
    async def parse(
        self,
        file_path: Path,
        mime_type: str | None = None,
        strategy: ParserStrategy | None = None,
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
            strategy=strategy,
        )

        return await parser.parse(file_path, mime_type=mime_type, strategy=strategy)

    async def chunk_elements(
        self,
        elements: list[DocumentElement],
        max_characters: int = 1500,
        overlap: int = 150,
    ) -> list[DocumentChunk]:
        return await chunker_service.chunk_elements(
            elements,
            max_characters=max_characters,
            overlap=overlap,
        )
