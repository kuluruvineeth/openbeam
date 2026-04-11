import type { AnswerCitation } from "./types";

const WEIGHTS = {
  topRelevance: 0.4,
  meanRelevance: 0.25,
  citationCoverage: 0.2,
  documentCoverage: 0.15,
} as const;

const HEDGE_WORDS = [
  "may",
  "might",
  "could",
  "possibly",
  "perhaps",
  "unclear",
  "not sure",
  "i think",
  "probably",
  "uncertain",
  "limited information",
  "couldn't find",
];

const MAX_HEDGE_PENALTY = 0.4;
const HEDGE_PENALTY_PER_WORD = 0.1;
const CITATION_COVERAGE_TARGET = 3;
const DOCUMENT_COVERAGE_TARGET = 5;

export function computeConfidence(
  answer: string,
  citations: AnswerCitation[],
  totalDocuments: number
): number {
  const topRelevance = normalizeScore(citations[0]?.relevanceScore ?? 0);

  const meanRelevance =
    citations.length > 0
      ? citations.reduce(
          (sum, c) => sum + normalizeScore(c.relevanceScore),
          0
        ) / citations.length
      : 0;

  const citationCoverage = Math.min(
    citations.length / CITATION_COVERAGE_TARGET,
    1
  );

  const documentCoverage = Math.min(
    totalDocuments / DOCUMENT_COVERAGE_TARGET,
    1
  );

  const raw =
    WEIGHTS.topRelevance * topRelevance +
    WEIGHTS.meanRelevance * meanRelevance +
    WEIGHTS.citationCoverage * citationCoverage +
    WEIGHTS.documentCoverage * documentCoverage;

  const hedgePenalty = computeHedgePenalty(answer);

  return clamp(raw - hedgePenalty);
}

function normalizeScore(score: number): number {
  return Math.min(score / 1.0, 1.0);
}

function computeHedgePenalty(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const word of HEDGE_WORDS) {
    if (lower.includes(word)) {
      count += 1;
    }
  }
  return Math.min(count * HEDGE_PENALTY_PER_WORD, MAX_HEDGE_PENALTY);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
