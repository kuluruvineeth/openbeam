import asyncio
import contextlib
from pathlib import Path
from typing import Any

from unstructured.documents.elements import Element
from unstructured.partition.auto import partition

from engine.core.config import settings
from engine.core.logging import get_logger
from engine.models.document import DocumentElement, ParsedDocument
from engine.parsers.base import BaseParser

logger = get_logger(__name__)


class DocumentParser(BaseParser):
    @property
    def name(self) -> str:
        return "document"

    @property
    def supported_mimes(self) -> list[str]:
        return [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/rtf",
            "text/rtf",
            "application/vnd.oasis.opendocument.text",
            "text/plain",
            "text/markdown",
            "text/x-markdown",
            "text/html",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.oasis.opendocument.spreadsheet",
            "text/csv",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.oasis.opendocument.presentation",
            "application/json",
            "application/xml",
            "text/xml",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/tiff",
            "image/bmp",
        ]

    @property
    def supported_extensions(self) -> list[str]:
        return [
            "pdf",
            "doc",
            "docx",
            "rtf",
            "odt",
            "txt",
            "md",
            "html",
            "htm",
            "xls",
            "xlsx",
            "ods",
            "csv",
            "ppt",
            "pptx",
            "odp",
            "json",
            "xml",
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "tiff",
            "tif",
            "bmp",
        ]

    async def parse(self, file_path: Path) -> ParsedDocument:
        logger.debug("parsing_document", path=str(file_path))

        elements = await asyncio.to_thread(
            partition,
            filename=str(file_path),
            strategy=settings.parser_strategy,
            include_page_breaks=True,
        )

        doc_elements = [self._convert_element(el) for el in elements]
        metadata = self._extract_metadata(elements)
        text_length = sum(len(el.text) for el in doc_elements)

        page_count = None
        for el in elements:
            if hasattr(el, "metadata") and hasattr(el.metadata, "page_number"):
                page_num = el.metadata.page_number
                if page_num and (page_count is None or page_num > page_count):
                    page_count = page_num

        logger.info(
            "document_parsed",
            path=str(file_path),
            elements=len(doc_elements),
            pages=page_count,
            text_length=text_length,
        )

        return ParsedDocument(
            elements=doc_elements,
            metadata=metadata,
            page_count=page_count,
            text_length=text_length,
        )

    def _convert_element(self, element: Element) -> DocumentElement:
        metadata = {}
        page_number = None
        if hasattr(element, "metadata"):
            with contextlib.suppress(Exception):
                metadata = element.metadata.to_dict()
            if hasattr(element.metadata, "page_number"):
                page_number = element.metadata.page_number

        return DocumentElement(
            type=element.category,
            text=str(element),
            metadata=metadata,
            page_number=page_number,
        )

    def _extract_metadata(self, elements: list[Element]) -> dict[str, Any]:
        metadata: dict[str, Any] = {
            "element_count": len(elements),
            "element_types": {},
        }

        for el in elements:
            el_type = el.category
            metadata["element_types"][el_type] = (
                metadata["element_types"].get(el_type, 0) + 1
            )

            if hasattr(el, "metadata"):
                if hasattr(el.metadata, "filename") and el.metadata.filename:
                    metadata["filename"] = el.metadata.filename
                if hasattr(el.metadata, "filetype") and el.metadata.filetype:
                    metadata["filetype"] = el.metadata.filetype
                if hasattr(el.metadata, "languages") and el.metadata.languages:
                    metadata["languages"] = el.metadata.languages

        return metadata
