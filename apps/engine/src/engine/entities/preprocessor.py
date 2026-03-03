from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MaskedSpan:
    start: int
    end: int
    placeholder: str
    original: str


@dataclass(slots=True)
class PreprocessedText:
    cleaned: str
    masks: list[MaskedSpan]

    def remap_offset(self, cleaned_offset: int) -> int:
        shift = 0
        for mask in self.masks:
            placeholder_len = len(mask.placeholder)
            original_len = mask.end - mask.start
            if mask.start + shift <= cleaned_offset:
                if cleaned_offset < mask.start + shift + placeholder_len:
                    return mask.start
                shift += original_len - placeholder_len
            else:
                break
        return cleaned_offset + shift


_MASK_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"```[\s\S]*?```|~~~[\s\S]*?~~~"), " "),
    (re.compile(r"`[^`\n]+`"), " "),
    (
        re.compile(
            r"(?:mongodb(?:\+srv)?|postgresql|postgres|mysql|redis|rediss|amqp|mssql|sqlite)"
            r"://\S+",
            re.IGNORECASE,
        ),
        " ",
    ),
    (re.compile(r"-----BEGIN\s[\w\s]+-----[\s\S]*?-----END\s[\w\s]+-----"), " "),
    (re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), " "),
    (re.compile(r"arn:aws[a-z-]*:\S+"), " "),
    (
        re.compile(
            r"(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret[_-]?key"
            r"|bearer)\s*[:=]\s*['\"]?\S{20,}['\"]?",
            re.IGNORECASE,
        ),
        " ",
    ),
    (
        re.compile(
            r"(?:gh[ps]_[0-9a-zA-Z]{36}"
            r"|github_pat_\w{82}"
            r"|gho_[0-9a-zA-Z]{36}"
            r"|glpat-[\w-]{20,}"
            r"|xox[pboa]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34})"
        ),
        " ",
    ),
    (
        re.compile(
            r"(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)"
        ),
        " ",
    ),
    (re.compile(r"@sha256:[a-f0-9]{64}"), " "),
    (re.compile(r"\b[0-9a-f]{40}\b"), " "),
    (re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE), " "),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), " "),
    (re.compile(r"(?:/[\w.-]+){3,}|[A-Z]:\\(?:[\w.-]+\\){2,}[\w.-]+"), " "),
    (
        re.compile(
            r"\s+at\s+[\w.$<>]+\([^)]+\)" r'|File\s+"[^"]+",\s+line\s+\d+'
        ),
        " ",
    ),
    (re.compile(r"!\[[^\]]*\]\([^)]+\)"), " "),
]

_MD_LINK_PATTERN = re.compile(r"\[([^\]]*)\]\([^)]+\)")
_MD_HEADING_PATTERN = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_MD_EMPHASIS_PATTERN = re.compile(r"\*{1,3}|_{1,3}")
_WHITESPACE_PATTERN = re.compile(r"[ \t]+")
_BLANK_LINES_PATTERN = re.compile(r"\n{3,}")


class TextPreprocessor:
    def clean(self, text: str) -> PreprocessedText:
        if not text:
            return PreprocessedText(cleaned="", masks=[])

        masks: list[MaskedSpan] = []
        result = text

        for pattern, placeholder in _MASK_PATTERNS:
            new_masks: list[MaskedSpan] = []
            new_result_parts: list[str] = []
            last_end = 0

            for match in pattern.finditer(result):
                new_result_parts.append(result[last_end : match.start()])
                new_masks.append(
                    MaskedSpan(
                        start=match.start(),
                        end=match.end(),
                        placeholder=placeholder,
                        original=match.group(),
                    )
                )
                new_result_parts.append(placeholder)
                last_end = match.end()

            if new_masks:
                new_result_parts.append(result[last_end:])
                result = "".join(new_result_parts)
                masks.extend(new_masks)

        result = _MD_LINK_PATTERN.sub(r"\1", result)
        result = _MD_HEADING_PATTERN.sub("", result)
        result = _MD_EMPHASIS_PATTERN.sub("", result)
        result = _WHITESPACE_PATTERN.sub(" ", result)
        result = _BLANK_LINES_PATTERN.sub("\n\n", result)
        result = result.strip()

        return PreprocessedText(cleaned=result, masks=masks)
