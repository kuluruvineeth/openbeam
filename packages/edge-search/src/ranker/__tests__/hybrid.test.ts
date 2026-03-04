import { describe, expect, it } from "bun:test";
import { hybridRank, rrfRank } from "../hybrid";

describe("hybridRank", () => {
  it("returns empty array for empty inputs", () => {
    const result = hybridRank([], [], 0.5);
    expect(result).toEqual([]);
  });

  it("returns only FTS results when alpha is 0", () => {
    const fts = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const result = hybridRank(fts, [], 0);
    expect(result[0].documentId).toBe("a");
    expect(result[0].ftsScore).toBe(1);
    expect(result[0].vectorScore).toBe(0);
    expect(result[0].score).toBe(1);
    expect(result[1].documentId).toBe("b");
    expect(result[1].ftsScore).toBe(0);
    expect(result[1].score).toBe(0);
  });

  it("returns only vector results when alpha is 1", () => {
    const vector = [
      { documentId: "x", score: 0.9 },
      { documentId: "y", score: 0.3 },
    ];
    const result = hybridRank([], vector, 1);
    expect(result[0].documentId).toBe("x");
    expect(result[0].vectorScore).toBe(1);
    expect(result[0].ftsScore).toBe(0);
    expect(result[0].score).toBe(1);
  });

  it("combines FTS and vector with alpha 0.5", () => {
    const fts = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const vector = [
      { documentId: "b", score: 0.9 },
      { documentId: "c", score: 0.3 },
    ];
    const result = hybridRank(fts, vector, 0.5);
    expect(result.length).toBe(3);
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it("normalizes scores to [0,1] range", () => {
    const fts = [
      { documentId: "a", score: 100 },
      { documentId: "b", score: 50 },
      { documentId: "c", score: 0 },
    ];
    const result = hybridRank(fts, [], 0);
    expect(result[0].ftsScore).toBe(1);
    expect(result[1].ftsScore).toBe(0.5);
    expect(result[2].ftsScore).toBe(0);
  });

  it("handles single result normalization", () => {
    const fts = [{ documentId: "a", score: 42 }];
    const result = hybridRank(fts, [], 0);
    expect(result[0].ftsScore).toBe(1);
    expect(result[0].score).toBe(1);
  });

  it("handles identical scores", () => {
    const fts = [
      { documentId: "a", score: 5 },
      { documentId: "b", score: 5 },
    ];
    const result = hybridRank(fts, [], 0);
    expect(result[0].ftsScore).toBe(1);
    expect(result[1].ftsScore).toBe(1);
  });

  it("sorts by combined score descending", () => {
    const fts = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 1 },
    ];
    const vector = [
      { documentId: "b", score: 0.99 },
      { documentId: "a", score: 0.01 },
    ];
    const result = hybridRank(fts, vector, 0.8);
    expect(result[0].documentId).toBe("b");
    expect(result[1].documentId).toBe("a");
  });

  it("includes documents from both result sets", () => {
    const fts = [{ documentId: "a", score: 10 }];
    const vector = [{ documentId: "b", score: 0.9 }];
    const result = hybridRank(fts, vector, 0.5);
    const ids = result.map((r) => r.documentId);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });

  it("handles overlapping documents correctly", () => {
    const fts = [
      { documentId: "shared", score: 10 },
      { documentId: "fts-only", score: 5 },
    ];
    const vector = [
      { documentId: "shared", score: 0.8 },
      { documentId: "vec-only", score: 0.9 },
    ];
    const result = hybridRank(fts, vector, 0.5);
    expect(result.length).toBe(3);
    const shared = result.find((r) => r.documentId === "shared");
    expect(shared).toBeDefined();
    expect(shared?.ftsScore).toBeDefined();
    expect(shared?.vectorScore).toBeDefined();
  });

  it("assigns zero for missing FTS score in vector-only docs", () => {
    const vector = [{ documentId: "v1", score: 0.8 }];
    const result = hybridRank([], vector, 0.7);
    expect(result[0].ftsScore).toBe(0);
  });

  it("assigns zero for missing vector score in FTS-only docs", () => {
    const fts = [{ documentId: "f1", score: 10 }];
    const result = hybridRank(fts, [], 0.3);
    expect(result[0].vectorScore).toBe(0);
  });

  it("handles negative scores in normalization", () => {
    const fts = [
      { documentId: "a", score: -5 },
      { documentId: "b", score: 5 },
    ];
    const result = hybridRank(fts, [], 0);
    expect(result[0].documentId).toBe("b");
    expect(result[0].ftsScore).toBe(1);
    expect(result[1].ftsScore).toBe(0);
  });

  it("handles large number of results", () => {
    const fts = Array.from({ length: 100 }, (_, i) => ({
      documentId: `doc-${i}`,
      score: 100 - i,
    }));
    const result = hybridRank(fts, [], 0);
    expect(result.length).toBe(100);
    expect(result[0].documentId).toBe("doc-0");
    expect(result[99].documentId).toBe("doc-99");
  });
});

describe("rrfRank", () => {
  it("returns empty for no result sets", () => {
    const result = rrfRank([]);
    expect(result).toEqual([]);
  });

  it("returns empty for empty result sets", () => {
    const result = rrfRank([[], []]);
    expect(result).toEqual([]);
  });

  it("ranks single result set", () => {
    const results = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const ranked = rrfRank([results]);
    expect(ranked[0].documentId).toBe("a");
    expect(ranked[1].documentId).toBe("b");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("fuses two result sets with overlapping documents", () => {
    const set1 = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const set2 = [
      { documentId: "b", score: 0.9 },
      { documentId: "a", score: 0.1 },
    ];
    const ranked = rrfRank([set1, set2]);
    expect(ranked.length).toBe(2);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it("handles non-overlapping result sets", () => {
    const set1 = [{ documentId: "a", score: 10 }];
    const set2 = [{ documentId: "b", score: 5 }];
    const ranked = rrfRank([set1, set2]);
    expect(ranked.length).toBe(2);
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it("uses custom k parameter", () => {
    const results = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const ranked1 = rrfRank([results], 60);
    const ranked2 = rrfRank([results], 1);

    expect(ranked1[0].score).not.toBe(ranked2[0].score);
    expect(ranked2[0].score).toBeGreaterThan(ranked1[0].score);
  });

  it("gives higher score to documents appearing in multiple sets", () => {
    const set1 = [
      { documentId: "a", score: 10 },
      { documentId: "b", score: 5 },
    ];
    const set2 = [
      { documentId: "a", score: 0.9 },
      { documentId: "c", score: 0.5 },
    ];
    const ranked = rrfRank([set1, set2]);
    const scoreA = ranked.find((r) => r.documentId === "a")?.score;
    const scoreB = ranked.find((r) => r.documentId === "b")?.score;
    const scoreC = ranked.find((r) => r.documentId === "c")?.score;
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA).toBeGreaterThan(scoreC);
  });

  it("handles three result sets", () => {
    const set1 = [{ documentId: "a", score: 10 }];
    const set2 = [{ documentId: "a", score: 10 }];
    const set3 = [{ documentId: "a", score: 10 }];
    const ranked = rrfRank([set1, set2, set3]);
    expect(ranked.length).toBe(1);
    expect(ranked[0].score).toBeCloseTo(3 / 61, 10);
  });

  it("returns sorted by score descending", () => {
    const set1 = [
      { documentId: "c", score: 1 },
      { documentId: "a", score: 3 },
      { documentId: "b", score: 2 },
    ];
    const ranked = rrfRank([set1]);
    expect(ranked[0].documentId).toBe("a");
    expect(ranked[1].documentId).toBe("b");
    expect(ranked[2].documentId).toBe("c");
  });

  it("uses rank position not raw score for RRF computation", () => {
    const set1 = [
      { documentId: "a", score: 1000 },
      { documentId: "b", score: 1 },
    ];
    const set2 = [
      { documentId: "b", score: 1000 },
      { documentId: "a", score: 1 },
    ];
    const ranked = rrfRank([set1, set2]);
    const scoreA = ranked.find((r) => r.documentId === "a")?.score;
    const scoreB = ranked.find((r) => r.documentId === "b")?.score;
    expect(scoreA).toBeCloseTo(scoreB, 10);
  });
});
