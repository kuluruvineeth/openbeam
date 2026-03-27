import { describe, expect, it, mock } from "bun:test";
import {
  DEDUP_DECISION_SYSTEM_PROMPT,
  DEDUP_SIMILARITY_THRESHOLD,
  MAX_CANDIDATES_PER_BATCH,
  MAX_SIMILAR_CANDIDATES,
} from "../memory-deduplicator";

mock.module("@openbeam/vespa", () => ({
  searchContext: mock(() =>
    Promise.resolve({
      hits: [
        {
          id: "1",
          relevance: 0.92,
          document: {
            uri: "openbeam://user/t1/u1/memories/preferences/ts",
            abstract_text: "Prefers TypeScript",
          },
        },
        {
          id: "2",
          relevance: 0.78,
          document: {
            uri: "openbeam://user/t1/u1/memories/preferences/js",
            abstract_text: "Uses JavaScript",
          },
        },
      ],
      totalCount: 2,
      metrics: {},
    })
  ),
}));

describe("deduplication constants", () => {
  it("has correct similarity threshold", () => {
    expect(DEDUP_SIMILARITY_THRESHOLD).toBe(0.85);
  });

  it("has correct max similar candidates", () => {
    expect(MAX_SIMILAR_CANDIDATES).toBe(5);
  });

  it("has correct max candidates per batch", () => {
    expect(MAX_CANDIDATES_PER_BATCH).toBe(10);
  });
});

describe("findSimilarMemories", () => {
  it("returns results above threshold", async () => {
    const { findSimilarMemories } = await import("../memory-deduplicator");
    const results = await findSimilarMemories(
      "t1",
      "u1",
      "preferences",
      [0.1, 0.2]
    );
    expect(results).toHaveLength(1);
    const match = results[0] as (typeof results)[0];
    expect(match.score).toBe(0.92);
    expect(match.uri).toBe("openbeam://user/t1/u1/memories/preferences/ts");
  });
});

describe("DEDUP_DECISION_SYSTEM_PROMPT", () => {
  it("contains all decision types", () => {
    expect(DEDUP_DECISION_SYSTEM_PROMPT).toContain("skip");
    expect(DEDUP_DECISION_SYSTEM_PROMPT).toContain("create");
    expect(DEDUP_DECISION_SYSTEM_PROMPT).toContain("merge");
    expect(DEDUP_DECISION_SYSTEM_PROMPT).toContain("delete");
  });
});
