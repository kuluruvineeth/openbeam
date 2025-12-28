from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class RelevanceGrade(IntEnum):
    NOT_RELEVANT = 0
    MARGINAL = 1
    RELEVANT = 2
    HIGHLY_RELEVANT = 3
    PERFECT = 4


@dataclass
class ClickSignal:
    position: int
    was_clicked: bool
    dwell_time_ms: int | None
    feedback_type: str | None


DEFAULT_EXAMINATION_PROBS = [
    1.0,
    0.85,
    0.72,
    0.60,
    0.50,
    0.42,
    0.35,
    0.29,
    0.24,
    0.20,
    0.17,
    0.14,
    0.12,
    0.10,
    0.08,
    0.07,
    0.06,
    0.05,
    0.04,
    0.03,
]


def compute_relevance_label(signal: ClickSignal) -> float:
    if signal.feedback_type == "helpful":
        return float(RelevanceGrade.PERFECT)

    if signal.feedback_type == "not_helpful":
        return float(RelevanceGrade.NOT_RELEVANT)

    if not signal.was_clicked:
        return 0.0

    if signal.dwell_time_ms is None:
        return float(RelevanceGrade.MARGINAL)

    if signal.dwell_time_ms >= 30000:
        return float(RelevanceGrade.HIGHLY_RELEVANT)
    if signal.dwell_time_ms >= 10000:
        return float(RelevanceGrade.RELEVANT)
    if signal.dwell_time_ms >= 3000:
        return float(RelevanceGrade.MARGINAL)

    return float(RelevanceGrade.MARGINAL)


def apply_position_bias_correction(
    relevance: float,
    position: int,
    examination_probs: list[float] | None = None,
) -> float:
    if examination_probs is None:
        examination_probs = DEFAULT_EXAMINATION_PROBS

    if position >= len(examination_probs):
        exam_prob = 0.02
    else:
        exam_prob = examination_probs[position]

    if exam_prob < 0.01:
        return relevance

    return relevance / exam_prob
