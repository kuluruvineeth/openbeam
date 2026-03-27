import { describe, expect, it } from "bun:test";
import { finalScore, hotnessScore, propagateScore } from "../hotness";

describe("hotnessScore", () => {
  const now = new Date();

  it("returns frequency ~0.5 when activeCount is 0", () => {
    const score = hotnessScore(0, now);
    expect(score).toBeCloseTo(0.5, 2);
  });

  it("returns frequency near 1.0 when activeCount is high", () => {
    const score = hotnessScore(100, now);
    expect(score).toBeGreaterThan(0.95);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("returns lower score for older entries with same activeCount", () => {
    const recent = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const recentScore = hotnessScore(10, recent);
    const oldScore = hotnessScore(10, old);
    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it("halves recency at exactly one half-life (7 days)", () => {
    const atZero = hotnessScore(10, now);
    const sevenDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const atHalfLife = hotnessScore(10, sevenDaysAgo);
    expect(atHalfLife).toBeCloseTo(atZero / 2, 2);
  });

  it("returns near zero for very old entries (365 days)", () => {
    const yearAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
    const score = hotnessScore(10, yearAgo);
    expect(score).toBeCloseTo(0, 4);
  });
});

describe("finalScore", () => {
  it("returns semanticScore when hotnessWeight is 0", () => {
    expect(finalScore(0.8, 0.6, 0)).toBeCloseTo(0.8, 10);
  });

  it("returns hotness when hotnessWeight is 1", () => {
    expect(finalScore(0.8, 0.6, 1)).toBeCloseTo(0.6, 10);
  });

  it("blends 0.8 semantic + 0.2 hotness with default weight", () => {
    const result = finalScore(1.0, 0.5);
    expect(result).toBeCloseTo(0.8 * 1.0 + 0.2 * 0.5, 10);
  });
});

describe("propagateScore", () => {
  it("averages when childWeight is 0.5", () => {
    expect(propagateScore(0.8, 0.4)).toBeCloseTo(0.6, 10);
  });

  it("returns childScore when childWeight is 1", () => {
    expect(propagateScore(0.8, 0.4, 1)).toBeCloseTo(0.8, 10);
  });

  it("returns parentScore when childWeight is 0", () => {
    expect(propagateScore(0.8, 0.4, 0)).toBeCloseTo(0.4, 10);
  });
});
