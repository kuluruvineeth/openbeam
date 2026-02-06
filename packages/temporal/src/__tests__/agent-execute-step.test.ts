import { describe, expect, it, vi } from "vitest";

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
    }),
  },
}));

import { createExecuteAgentStepActivity } from "../activities/agents/execute-agent-step";
import type { AgentExecutor } from "../activities/agents/types";

function createMockExecutor(
  overrides: Partial<
    ReturnType<AgentExecutor["executeStep"]> extends Promise<infer T>
      ? T
      : never
  > = {}
): AgentExecutor {
  return {
    executeStep: vi.fn().mockResolvedValue({
      artifacts: [{ type: "text", content: "result" }],
      complete: false,
      tokensUsed: 150,
      costCents: 0.5,
      ...overrides,
    }),
  };
}

describe("executeAgentStep", () => {
  it("delegates to executor and returns structured output", async () => {
    const executor = createMockExecutor();
    const activity = createExecuteAgentStepActivity({ executor });

    const result = await activity({
      sessionId: "session-1",
      agentType: "research",
      step: 3,
      previousArtifacts: [],
      context: { query: "test" },
    });

    expect(executor.executeStep).toHaveBeenCalledWith(
      "session-1",
      "research",
      3,
      [],
      { query: "test" }
    );
    expect(result.artifacts).toEqual([{ type: "text", content: "result" }]);
    expect(result.complete).toBe(false);
    expect(result.tokensUsed).toBe(150);
    expect(result.costCents).toBe(0.5);
    expect(result.checkpoint).toEqual({
      step: 3,
      state: { query: "test" },
      timestamp: expect.any(Number),
    });
  });

  it("marks step as complete when executor signals completion", async () => {
    const executor = createMockExecutor({ complete: true });
    const activity = createExecuteAgentStepActivity({ executor });

    const result = await activity({
      sessionId: "session-1",
      agentType: "analysis",
      step: 5,
      previousArtifacts: [],
      context: {},
    });

    expect(result.complete).toBe(true);
  });

  it("defaults tokensUsed and costCents to 0 when not provided", async () => {
    const executor: AgentExecutor = {
      executeStep: vi.fn().mockResolvedValue({
        artifacts: [],
        complete: true,
      }),
    };
    const activity = createExecuteAgentStepActivity({ executor });

    const result = await activity({
      sessionId: "session-1",
      agentType: "basic",
      step: 1,
      previousArtifacts: [],
      context: {},
    });

    expect(result.tokensUsed).toBe(0);
    expect(result.costCents).toBe(0);
  });

  it("passes previousArtifacts to executor", async () => {
    const executor = createMockExecutor();
    const activity = createExecuteAgentStepActivity({ executor });

    const artifacts = [
      { type: "text", content: "prior result" },
      { type: "code", content: "console.log('hi')" },
    ];

    await activity({
      sessionId: "session-1",
      agentType: "research",
      step: 2,
      previousArtifacts: artifacts as any,
      context: {},
    });

    expect(executor.executeStep).toHaveBeenCalledWith(
      "session-1",
      "research",
      2,
      artifacts,
      {}
    );
  });
});
