from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExtractedEntity:
    text: str
    label: str
    score: float
    start: int
    end: int
    source: str
