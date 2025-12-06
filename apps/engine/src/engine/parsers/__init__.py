from typing import TYPE_CHECKING

from engine.core.logging import get_logger

if TYPE_CHECKING:
    from engine.parsers.base import BaseParser

logger = get_logger(__name__)


class ParserRegistry:
    _parsers: dict[str, "BaseParser"] = {}
    _mime_to_parser: dict[str, "BaseParser"] = {}
    _extension_to_parser: dict[str, "BaseParser"] = {}

    @classmethod
    def register(cls, parser: "BaseParser") -> None:
        cls._parsers[parser.name] = parser

        for mime in parser.supported_mimes:
            cls._mime_to_parser[mime] = parser
            logger.debug("registered_mime", parser=parser.name, mime=mime)

        for ext in parser.supported_extensions:
            cls._extension_to_parser[ext.lower()] = parser
            logger.debug("registered_extension", parser=parser.name, ext=ext)

        logger.info(
            "parser_registered",
            name=parser.name,
            mimes=len(parser.supported_mimes),
            extensions=len(parser.supported_extensions),
        )

    @classmethod
    def get_parser_for_mime(cls, mime_type: str) -> "BaseParser | None":
        return cls._mime_to_parser.get(mime_type)

    @classmethod
    def get_parser_for_extension(cls, extension: str) -> "BaseParser | None":
        return cls._extension_to_parser.get(extension.lower())

    @classmethod
    def get_parser(cls, name: str) -> "BaseParser | None":
        return cls._parsers.get(name)

    @classmethod
    def supported_mimes(cls) -> list[str]:
        return list(cls._mime_to_parser.keys())

    @classmethod
    def supported_extensions(cls) -> list[str]:
        return list(cls._extension_to_parser.keys())

    @classmethod
    def all_parsers(cls) -> list["BaseParser"]:
        return list(cls._parsers.values())

    @classmethod
    def clear(cls) -> None:
        cls._parsers.clear()
        cls._mime_to_parser.clear()
        cls._extension_to_parser.clear()


def register_all_parsers() -> None:
    # Import here to avoid circular imports
    from engine.parsers.document import DocumentParser

    ParserRegistry.register(DocumentParser())

    logger.info(
        "all_parsers_registered",
        total=len(ParserRegistry.all_parsers()),
        mimes=len(ParserRegistry.supported_mimes()),
    )


__all__ = ["ParserRegistry", "register_all_parsers"]
