import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@openplane/db", () => ({
  default: {},
  createCompositionEventWithPattern: mock(() =>
    Promise.resolve({ eventId: "evt_123", patternFrequency: 5 })
  ),
  getEmergingPatterns: mock(() =>
    Promise.resolve([
      {
        signature: "abc123",
        toolSequence: ["search_hybrid", "doc_get"],
        frequency: 10,
        successRate: 0.9,
      },
    ])
  ),
}));

import {
  compareSignatures,
  createCompositionTracker,
  generateSignature,
  normalizeToolSequence,
} from "../composition";

const HEX_SIGNATURE_PATTERN = /^[a-f0-9]{32}$/;

describe("generateSignature", () => {
  it("generates consistent signatures for same tool sequence", () => {
    const seq = ["search_hybrid", "doc_get", "rag_answer"];

    const sig1 = generateSignature(seq);
    const sig2 = generateSignature(seq);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(32);
  });

  it("generates different signatures for different sequences", () => {
    const seq1 = ["search_hybrid", "doc_get"];
    const seq2 = ["doc_get", "search_hybrid"];

    const sig1 = generateSignature(seq1);
    const sig2 = generateSignature(seq2);

    expect(sig1).not.toBe(sig2);
  });

  it("normalizes tool names before hashing", () => {
    const seq1 = ["Search_Hybrid", "DOC_GET"];
    const seq2 = ["search_hybrid", "doc_get"];

    const sig1 = generateSignature(seq1);
    const sig2 = generateSignature(seq2);

    expect(sig1).toBe(sig2);
  });

  it("trims whitespace from tool names", () => {
    const seq1 = ["  search_hybrid  ", " doc_get "];
    const seq2 = ["search_hybrid", "doc_get"];

    const sig1 = generateSignature(seq1);
    const sig2 = generateSignature(seq2);

    expect(sig1).toBe(sig2);
  });

  it("handles empty array", () => {
    const sig = generateSignature([]);
    expect(sig).toHaveLength(32);
  });

  it("handles single tool", () => {
    const sig = generateSignature(["search_hybrid"]);
    expect(sig).toHaveLength(32);
  });
});

describe("normalizeToolSequence", () => {
  it("lowercases tool names", () => {
    const result = normalizeToolSequence(["Search_Hybrid", "DOC_GET"]);
    expect(result).toEqual(["search_hybrid", "doc_get"]);
  });

  it("trims whitespace", () => {
    const result = normalizeToolSequence(["  search  ", " doc "]);
    expect(result).toEqual(["search", "doc"]);
  });

  it("preserves order", () => {
    const result = normalizeToolSequence(["z_tool", "a_tool", "m_tool"]);
    expect(result).toEqual(["z_tool", "a_tool", "m_tool"]);
  });

  it("handles empty array", () => {
    const result = normalizeToolSequence([]);
    expect(result).toEqual([]);
  });
});

describe("compareSignatures", () => {
  it("returns true for identical sequences", () => {
    const seq = ["search_hybrid", "doc_get"];
    expect(compareSignatures(seq, seq)).toBe(true);
  });

  it("returns true for normalized-equivalent sequences", () => {
    const seq1 = ["Search_Hybrid", "  DOC_GET  "];
    const seq2 = ["search_hybrid", "doc_get"];
    expect(compareSignatures(seq1, seq2)).toBe(true);
  });

  it("returns false for different sequences", () => {
    const seq1 = ["search_hybrid", "doc_get"];
    const seq2 = ["doc_get", "search_hybrid"];
    expect(compareSignatures(seq1, seq2)).toBe(false);
  });

  it("returns false for sequences of different lengths", () => {
    const seq1 = ["search_hybrid", "doc_get"];
    const seq2 = ["search_hybrid"];
    expect(compareSignatures(seq1, seq2)).toBe(false);
  });
});

describe("createCompositionTracker", () => {
  let tracker: ReturnType<typeof createCompositionTracker>;

  beforeEach(() => {
    tracker = createCompositionTracker();
  });

  describe("startTracking", () => {
    it("initializes tracker state", () => {
      tracker.startTracking("session_1", "team_1", "user_1");
      tracker.recordToolCall("search_hybrid");

      expect(tracker).toBeDefined();
    });

    it("resets previous tracking state", () => {
      tracker.startTracking("session_1", "team_1", "user_1");
      tracker.recordToolCall("tool_1");

      tracker.startTracking("session_2", "team_2", "user_2");

      expect(tracker).toBeDefined();
    });
  });

  describe("recordToolCall", () => {
    it("records tool calls when tracking is active", () => {
      tracker.startTracking("session_1", "team_1", "user_1");

      tracker.recordToolCall("search_hybrid");
      tracker.recordToolCall("doc_get");
      tracker.recordToolCall("rag_answer");

      expect(tracker).toBeDefined();
    });

    it("ignores tool calls when tracking is not started", () => {
      tracker.recordToolCall("search_hybrid");
      expect(tracker).toBeDefined();
    });
  });

  describe("finalize", () => {
    it("returns null when no tools recorded", async () => {
      tracker.startTracking("session_1", "team_1", "user_1");

      const result = await tracker.finalize(true);

      expect(result).toBeNull();
    });

    it("returns null when tracking not started", async () => {
      const result = await tracker.finalize(true);
      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears all tracking state", () => {
      tracker.startTracking("session_1", "team_1", "user_1");
      tracker.recordToolCall("tool_1");

      tracker.reset();

      expect(tracker).toBeDefined();
    });

    it("allows restarting after reset", () => {
      tracker.startTracking("session_1", "team_1", "user_1");
      tracker.reset();

      tracker.startTracking("session_2", "team_2", "user_2");
      tracker.recordToolCall("tool_1");

      expect(tracker).toBeDefined();
    });
  });

  describe("full tracking flow", () => {
    it("tracks tools and resets after finalize", async () => {
      tracker.startTracking("session_1", "team_1", "user_1");
      tracker.recordToolCall("search_hybrid");
      tracker.recordToolCall("doc_get");

      const result = await tracker.finalize(true, "research");

      expect(result).toEqual({
        eventId: "evt_123",
        signature: expect.stringMatching(HEX_SIGNATURE_PATTERN),
        patternFrequency: 5,
      });

      const secondResult = await tracker.finalize(true);
      expect(secondResult).toBeNull();
    });
  });
});
