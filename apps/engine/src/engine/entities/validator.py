from __future__ import annotations

import re
from dataclasses import dataclass

from engine.entities.types import ExtractedEntity


@dataclass(frozen=True, slots=True)
class ValidationConfig:
    min_length: int = 2
    max_length: int = 100
    max_token_count: int = 8
    max_special_char_ratio: float = 0.3
    max_digit_ratio: float = 0.7
    person_min_confidence: float = 0.55


_SPECIAL_CHARS = re.compile(r"[{}()\[\]<>;:=+*/\\|~^`#$%&!?]")

_REJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"(?:mongodb|postgres|redis|mysql|amqp)://", re.IGNORECASE),
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"\S+@\S+\.\S+"),
    re.compile(r"^(?:/[\w.-]+){2,}$"),
    re.compile(r"^[A-Z]:\\", re.IGNORECASE),
    re.compile(r'^\s*\{.*[":]\s*\S+'),
    re.compile(r"sha256:[a-f0-9]{32,}"),
    re.compile(r"^[0-9a-f]{40}$"),
    re.compile(r"^v?\d+\.\d+\.\d+"),
    re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"),
    re.compile(r"^\d+$"),
    re.compile(r"^[A-Z][A-Z0-9_]{3,}$"),
]

_BLOCKLIST: frozenset[str] = frozenset(
    {
        "the",
        "a",
        "an",
        "this",
        "that",
        "these",
        "those",
        "it",
        "its",
        "they",
        "them",
        "we",
        "us",
        "our",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "and",
        "or",
        "but",
        "if",
        "then",
        "else",
        "true",
        "false",
        "null",
        "none",
        "undefined",
        "string",
        "number",
        "boolean",
        "object",
        "array",
        "class",
        "function",
        "return",
        "import",
        "export",
        "const",
        "let",
        "var",
        "type",
        "interface",
        "enum",
        "struct",
        "void",
        "http",
        "https",
        "ftp",
        "ssh",
        "tcp",
        "udp",
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "todo",
        "fixme",
        "hack",
        "xxx",
        "note",
        "ok",
        "error",
        "warning",
        "info",
        "debug",
        "yes",
        "no",
        "n/a",
        "tbd",
    }
)


class EntityValidator:
    def __init__(self, config: ValidationConfig | None = None) -> None:
        self._config = config or ValidationConfig()

    def validate(self, entity: ExtractedEntity) -> bool:
        text = entity.text.strip()

        if not self._passes_basic_checks(text):
            return False

        if any(p.search(text) for p in _REJECTION_PATTERNS):
            return False

        if len(text.split()) > self._config.max_token_count:
            return False

        if not self._passes_char_ratio_checks(text, entity):
            return False

        return not (
            entity.label == "person"
            and entity.source == "gliner"
            and entity.score < self._config.person_min_confidence
        )

    def _passes_basic_checks(self, text: str) -> bool:
        if not text:
            return False
        if len(text) < self._config.min_length or len(text) > self._config.max_length:
            return False
        return text.lower() not in _BLOCKLIST

    def _passes_char_ratio_checks(self, text: str, entity: ExtractedEntity) -> bool:
        if len(text) <= 3:
            return True

        special_count = len(_SPECIAL_CHARS.findall(text))
        if special_count / len(text) > self._config.max_special_char_ratio:
            return False

        if entity.label == "person":
            digit_count = sum(1 for c in text if c.isdigit())
            if digit_count / len(text) > self._config.max_digit_ratio:
                return False

        return True

    def filter_batch(
        self, entities: list[ExtractedEntity]
    ) -> list[ExtractedEntity]:
        return [e for e in entities if self.validate(e)]
