import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();

vi.mock("@openplane/ai", () => ({
  createLlmAgent: vi.fn(() => ({
    execute: mockExecute,
  })),
  createEmptyState: vi.fn(() => ({
    values: new Map(),
    history: [],
  })),
}));

import { createLlmAgent } from "@openplane/ai";
import { LlmAgentExecutor } from "../llm-agent-executor";

function createSuccessResult(output: string | unknown, hasToolCalls = false) {
  return {
    output,
    finishReason: "stop",
    state: { values: new Map(), history: [] },
    trace: {
      toolCalls: hasToolCalls
        ? [{ name: "search_hybrid", input: {}, output: {} }]
        : [],
    },
    totalTokens: {
      inputTokens: 500,
      outputTokens: 200,
    },
    durationMs: 1500,
  };
}

describe("LlmAgentExecutor", () => {
  let executor: LlmAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new LlmAgentExecutor();
  });

  describe("executeStep", () => {
    it("executes first step with prompt from context", async () => {
      mockExecute.mockResolvedValue(
        createSuccessResult("Research findings here")
      );

      const result = await executor.executeStep("session-1", "mission", 1, [], {
        prompt: "Research quantum computing",
        teamId: "team-1",
      });

      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts).toEqual([
        expect.objectContaining({
          id: "session-1-step-1",
          type: "text",
          content: "Research findings here",
        }),
      ]);
      expect(result.complete).toBe(true);
      expect(result.tokensUsed).toBe(700);
      expect(result.costCents).toBe(0);
    });

    it("marks incomplete when tool calls are pending", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Searching...", true));

      const result = await executor.executeStep("session-1", "mission", 1, [], {
        prompt: "Research topic",
      });

      expect(result.complete).toBe(false);
    });

    it("uses preset tools for researcher type", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Done"));

      await executor.executeStep("session-1", "researcher", 1, [], {
        preset: "researcher",
      });

      expect(createLlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: ["search_hybrid", "search_semantic", "doc_get", "rag_answer"],
        })
      );
    });

    it("uses wildcard tools for unknown preset", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Done"));

      await executor.executeStep("session-1", "custom", 1, [], {
        preset: "unknown_type",
      });

      expect(createLlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: ["*"],
        })
      );
    });

    it("falls back to agentType as preset when no preset in context", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Done"));

      await executor.executeStep("session-1", "analyst", 1, [], {});

      expect(createLlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: ["search_hybrid", "doc_get", "rag_analyze", "rag_answer"],
        })
      );
    });

    it("generates continuation prompt for step > 1", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Continued work"));

      const previousArtifacts = [
        {
          id: "session-1-step-1",
          type: "text",
          content: "Initial research",
          createdAt: Date.now(),
        },
      ];

      await executor.executeStep("session-1", "mission", 2, previousArtifacts, {
        prompt: "Original prompt",
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "Continue from your previous output. Step 2.",
        expect.any(Object)
      );
    });

    it("builds conversation history from context window when available", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Response"));

      const contextWindow = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      await executor.executeStep("session-1", "mission", 1, [], {
        prompt: "Continue",
        contextWindow,
        teamId: "team-1",
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "Continue",
        expect.objectContaining({
          conversationHistory: contextWindow,
        })
      );
    });

    it("builds conversation history from artifacts when no context window", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Step 2 output"));

      const previousArtifacts = [
        {
          id: "step-1",
          type: "text",
          content: "Step 1 output",
          createdAt: Date.now() - 1000,
        },
      ];

      await executor.executeStep("session-1", "mission", 2, previousArtifacts, {
        prompt: "Do research",
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          conversationHistory: [
            { role: "assistant", content: "Step 1 output" },
          ],
        })
      );
    });

    it("serializes non-string output as JSON", async () => {
      mockExecute.mockResolvedValue(createSuccessResult({ data: [1, 2, 3] }));

      const result = await executor.executeStep("session-1", "mission", 1, [], {
        prompt: "Get data",
      });

      expect(result.artifacts).toEqual([
        expect.objectContaining({ content: '{"data":[1,2,3]}' }),
      ]);
    });

    it("uses default prompt when none provided", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Output"));

      await executor.executeStep("session-1", "mission", 1, [], {});

      expect(mockExecute).toHaveBeenCalledWith(
        "Begin your task.",
        expect.any(Object)
      );
    });

    it("sets agent name from context or generates default", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Done"));

      await executor.executeStep("session-1", "mission", 1, [], {
        agentName: "research-bot",
      });

      expect(createLlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "research-bot",
        })
      );
    });

    it("generates default agent name from preset", async () => {
      mockExecute.mockResolvedValue(createSuccessResult("Done"));

      await executor.executeStep("session-1", "analyst", 1, [], {});

      expect(createLlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "agent-analyst",
        })
      );
    });
  });
});
