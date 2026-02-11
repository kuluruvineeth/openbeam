import { describe, expect, it } from "bun:test";
import {
  buildContextWindow,
  estimateTokenCount,
  trimConversationHistory,
} from "../context-window";

describe("trimConversationHistory", () => {
  it("keeps recent messages within token limit", () => {
    const history = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "A".repeat(100),
    }));
    const trimmed = trimConversationHistory(history, 500);
    expect(trimmed.length).toBeLessThan(50);
    expect(trimmed.at(-1)).toBe(history.at(-1));
  });

  it("returns all messages when under limit", () => {
    const history = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ];
    const trimmed = trimConversationHistory(history, 1000);
    expect(trimmed).toHaveLength(2);
  });

  it("returns empty array when first message exceeds limit", () => {
    const history = [{ role: "user", content: "A".repeat(10_000) }];
    const trimmed = trimConversationHistory(history, 10);
    expect(trimmed).toHaveLength(0);
  });

  it("preserves message order from oldest to newest", () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message-${i}`,
    }));
    const trimmed = trimConversationHistory(history, 10_000);
    expect(trimmed.map((m) => m.content)).toEqual(
      history.map((m) => m.content)
    );
  });

  it("returns empty array for empty history", () => {
    expect(trimConversationHistory([], 1000)).toHaveLength(0);
  });

  it("returns empty array when maxTokenEstimate is zero", () => {
    const history = [{ role: "user", content: "Hi" }];
    expect(trimConversationHistory(history, 0)).toHaveLength(0);
  });

  it("trims from the front, keeping newest messages", () => {
    const history = [
      { role: "user", content: "A".repeat(100) },
      { role: "assistant", content: "B".repeat(100) },
      { role: "user", content: "C".repeat(100) },
    ];
    const trimmed = trimConversationHistory(history, 25);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0]?.content).toBe("C".repeat(100));
  });
});

describe("estimateTokenCount", () => {
  it("estimates 1 token per 4 characters", () => {
    expect(estimateTokenCount("12345678")).toBe(2);
    expect(estimateTokenCount("123")).toBe(1);
  });

  it("rounds up partial tokens", () => {
    expect(estimateTokenCount("12345")).toBe(2);
  });

  it("returns zero for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });
});

describe("buildContextWindow", () => {
  it("reserves space for system prompt and canvas state", () => {
    const system = "A".repeat(400);
    const canvas = "B".repeat(400);
    const history = Array.from({ length: 20 }, () => ({
      role: "user",
      content: "C".repeat(100),
    }));

    const result = buildContextWindow(system, canvas, history, 500);

    expect(result.messages.length).toBeLessThan(20);
    expect(result.system).toContain("<canvas_state>");
  });

  it("includes canvas state wrapped in XML tags", () => {
    const result = buildContextWindow("prompt", "state-data", [], 1000);
    expect(result.system).toBe(
      "prompt\n\n<canvas_state>\nstate-data\n</canvas_state>"
    );
  });

  it("returns all messages when budget is generous", () => {
    const history = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ];
    const result = buildContextWindow("sys", "canvas", history, 100_000);
    expect(result.messages).toHaveLength(2);
  });

  it("returns empty messages when system + canvas consume all tokens", () => {
    const system = "A".repeat(4000);
    const canvas = "B".repeat(4000);
    const history = [{ role: "user", content: "Hi" }];

    const result = buildContextWindow(system, canvas, history, 2000);
    expect(result.messages).toHaveLength(0);
  });
});
