import { describe, expect, it } from "bun:test";
import type { SessionData } from "@openbeam/types/bot";
import {
  buildContextMessages,
  estimateTokens,
  formatContextForQuery,
} from "../../src/memory/context-builder";

function session(overrides: Partial<SessionData> = {}): SessionData {
  return { buffer: [], summary: null, ...overrides };
}

describe("buildContextMessages", () => {
  it("returns empty array for empty session", () => {
    expect(buildContextMessages(session())).toEqual([]);
  });

  it("prepends summary as system message", () => {
    const result = buildContextMessages(
      session({ summary: "User asked about deploys." })
    );
    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("User asked about deploys.");
  });

  it("appends buffer turns in order", () => {
    const result = buildContextMessages(
      session({
        buffer: [
          { role: "user", content: "What is the deploy process?", ts: 1 },
          { role: "assistant", content: "We use GitHub Actions.", ts: 2 },
        ],
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("preserves summary when trimming buffer", () => {
    const longContent = "x".repeat(20_000);
    const result = buildContextMessages(
      session({
        summary: "Important context",
        buffer: [
          { role: "user", content: longContent, ts: 1 },
          { role: "assistant", content: "Short answer", ts: 2 },
        ],
      })
    );
    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("Important context");
  });
});

describe("formatContextForQuery", () => {
  it("returns empty string for empty session", () => {
    expect(formatContextForQuery(session())).toBe("");
  });

  it("includes summary when present", () => {
    const result = formatContextForQuery(
      session({ summary: "User is asking about Kubernetes." })
    );
    expect(result).toContain("Previous context:");
    expect(result).toContain("Kubernetes");
  });

  it("includes recent turns", () => {
    const result = formatContextForQuery(
      session({
        buffer: [
          { role: "user", content: "What is K8s?", ts: 1 },
          { role: "assistant", content: "Container orchestration.", ts: 2 },
        ],
      })
    );
    expect(result).toContain("Recent conversation:");
    expect(result).toContain("K8s");
  });
});

describe("estimateTokens", () => {
  it("estimates roughly 1 token per 4 chars", () => {
    expect(estimateTokens("hello world")).toBe(3);
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });
});
