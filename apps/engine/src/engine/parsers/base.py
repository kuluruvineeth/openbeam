from abc import ABC, abstractmethod
from pathlib import Path
from typing import Literal

from engine.models.document import ParsedDocument

ParserStrategy = Literal["fast", "hi_res", "ocr_only", "auto"]


class BaseParser(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def supported_mimes(self) -> list[str]: ...

    @property
    def supported_extensions(self) -> list[str]:
        return []

    @abstractmethod
    async def parse(
        self,
        file_path: Path,
        mime_type: str | None = None,
        strategy: ParserStrategy | None = None,
    ) -> ParsedDocument: ...

    async def can_parse(self, file_path: Path, mime_type: str | None = None) -> bool:
        if mime_type and mime_type in self.supported_mimes:
            return True

        extension = file_path.suffix.lstrip(".").lower()
        return extension in self.supported_extensions
