import { describe, expect, test } from "bun:test";
import { computeConfidence } from "../confidence";
import type { AnswerCitation } from "../types";

function makeCitation(relevanceScore: number): AnswerCitation {
  return {
    documentId: "doc1",
    title: "Test",
    snippet: "snippet",
    relevanceScore,
    url: "https://example.com",
  };
}

describe("computeConfidence", () => {
  test("high relevance + many citations = high confidence", () => {
    const citations = [
      makeCitation(0.95),
      makeCitation(0.9),
      makeCitation(0.85),
    ];
    const result = computeConfidence("clear answer", citations, 10);
    expect(result).toBeGreaterThan(0.7);
  });

  test("zero citations = very low confidence", () => {
    const result = computeConfidence("some answer", [], 0);
    expect(result).toBe(0);
  });

  test("single low relevance citation = low confidence", () => {
    const citations = [makeCitation(0.2)];
    const result = computeConfidence("answer", citations, 1);
    expect(result).toBeLessThan(0.4);
  });

  test("hedge words reduce score", () => {
    const citations = [makeCitation(0.9), makeCitation(0.8)];
    const clean = computeConfidence("This is the answer", citations, 5);
    const hedged = computeConfidence(
      "I think this might possibly be the answer, but I'm not sure",
      citations,
      5
    );
    expect(hedged).toBeLessThan(clean);
  });

  test("score clamped to [0, 1]", () => {
    const many = Array.from({ length: 10 }, () => makeCitation(1.0));
    const result = computeConfidence("answer", many, 100);
    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test("many hedge words cap penalty at 0.4", () => {
    const citations = [
      makeCitation(0.9),
      makeCitation(0.85),
      makeCitation(0.8),
    ];
    const raw = computeConfidence("clear answer", citations, 5);
    const maxHedged = computeConfidence(
      "may might could possibly perhaps unclear not sure I think probably uncertain limited information couldn't find",
      citations,
      5
    );
    expect(raw - maxHedged).toBeLessThanOrEqual(0.41);
  });
});
