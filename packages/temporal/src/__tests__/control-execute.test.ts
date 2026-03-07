import { beforeEach, describe, expect, it, vi } from "vitest";

import { createControlExecuteActivity } from "../activities/agents/control-execute";

const mockExecute = vi.fn();

vi.mock("@openbeam/services/control/adapters/registry", () => ({
  getAdapterOrThrow: vi.fn(() => ({
    type: "claude-code",
    execute: mockExecute,
  })),
}));

vi.mock("@openbeam/services/control/secrets", () => ({
  resolveEnvBindings: vi.fn(
    (_db: unknown, _teamId: string, env: Record<string, unknown>) => {
      const resolved: Record<string, string> = {};
      for (const [key, val] of Object.entries(env)) {
        resolved[key] = String(val);
      }
      return resolved;
    }
  ),
}));

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
    }),
  },
}));

function createMockDb() {
  return {} as never;
}

function baseInput() {
  return {
    teamId: "team-1",
    agentId: "agent-1",
    runId: "run-1",
    adapterType: "claude-code",
    adapterConfig: { model: "opus", env: {} },
    runtimeConfig: {},
    agentName: "test-agent",
    sessionId: "session-1",
    sessionParams: null,
    payload: { task: "test" },
    reason: "test run",
  };
}

describe("control-execute activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls adapter.execute and returns mapped result", async () => {
    const db = createMockDb();
    mockExecute.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      errorMessage: null,
      sessionId: "session-2",
      sessionParams: null,
      provider: "anthropic",
      model: "claude-4",
      costUsd: 0.05,
      resultJson: { output: "done" },
    });

    const executeAdapter = createControlExecuteActivity({ db });
    const result = await executeAdapter(baseInput());

    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe("session-2");
    expect(result.provider).toBe("anthropic");
    expect(result.resultJson).toEqual({ output: "done" });
    expect(result.raw).toBeDefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("throws nonRetryable on budget exceeded", async () => {
    const db = createMockDb();
    mockExecute.mockResolvedValue({
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "Monthly budget exceeded",
      errorCode: "BUDGET_EXCEEDED",
    });

    const executeAdapter = createControlExecuteActivity({ db });

    await expect(executeAdapter(baseInput())).rejects.toThrow("budget");
  });

  it("throws retryable on unknown adapter errors", async () => {
    const db = createMockDb();
    mockExecute.mockRejectedValue(new Error("Connection reset"));

    const executeAdapter = createControlExecuteActivity({ db });

    await expect(executeAdapter(baseInput())).rejects.toThrow(
      "Connection reset"
    );
  });

  it("resolves env bindings before execution", async () => {
    const db = createMockDb();
    const inputWithEnv = {
      ...baseInput(),
      adapterConfig: {
        model: "opus",
        env: { API_KEY: "test-key" },
      },
    };

    mockExecute.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
    });

    const executeAdapter = createControlExecuteActivity({ db });
    await executeAdapter(inputWithEnv);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        env: { API_KEY: "test-key" },
      })
    );
  });
});
