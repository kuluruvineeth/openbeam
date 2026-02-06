import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@openplane/db", () => ({
  getExecutionWithSteps: vi.fn(),
  getRecentCompletedExecutions: vi.fn(),
  updateExecutionEval: vi.fn(),
}));

vi.mock("../observability/prometheus", () => ({
  recordEvalScore: vi.fn(),
}));

import {
  getExecutionWithSteps,
  getRecentCompletedExecutions,
  updateExecutionEval,
} from "@openplane/db";
import { createEvaluateCanvasExecutionActivity } from "../activities/canvas/eval";
import { recordEvalScore } from "../observability/prometheus";

type ExecutionWithSteps = NonNullable<
  Awaited<ReturnType<typeof getExecutionWithSteps>>
>;

const mockDb = {} as never;

function buildExecution(
  overrides: Record<string, unknown> = {}
): ExecutionWithSteps {
  return {
    id: "exec-1",
    agentCanvasId: "canvas-1",
    versionNumber: 1,
    status: "COMPLETED",
    latencyMs: 5000,
    tokenUsage: { totalTokens: 1000 } as never,
    input: null,
    output: null,
    error: null,
    currentNodeId: null,
    trace: null,
    evalScore: null,
    evalDimensions: null,
    evalFlags: null,
    triggeredById: "user-1",
    triggerSource: null,
    workflowId: null,
    runId: null,
    temporalStatus: null,
    historyEventCount: null,
    historySizeBytes: null,
    continueAsNewCount: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:05Z"),
    steps: [
      {
        id: "step-1",
        executionId: "exec-1",
        nodeId: "n1",
        nodeType: "template",
        status: "COMPLETED",
        latencyMs: 2000,
        input: null,
        output: null,
        error: null,
        startedAt: new Date("2025-01-01T00:00:00Z"),
        completedAt: new Date("2025-01-01T00:00:02Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        inputRef: null,
        outputRef: null,
      },
      {
        id: "step-2",
        executionId: "exec-1",
        nodeId: "n2",
        nodeType: "llm",
        status: "COMPLETED",
        latencyMs: 3000,
        input: null,
        output: null,
        error: null,
        startedAt: new Date("2025-01-01T00:00:02Z"),
        completedAt: new Date("2025-01-01T00:00:05Z"),
        createdAt: new Date("2025-01-01T00:00:02Z"),
        inputRef: null,
        outputRef: null,
      },
    ],
    approvals: [],
    ...overrides,
  } as unknown as ExecutionWithSteps;
}

type HistoricalEntry = Awaited<ReturnType<typeof getRecentCompletedExecutions>>;

function buildHistorical(
  entries: { latencyMs: number | null; tokenUsage: unknown }[]
): HistoricalEntry {
  return entries as unknown as HistoricalEntry;
}

describe("evaluateCanvasExecution activity", () => {
  const evaluate = createEvaluateCanvasExecutionActivity({ db: mockDb });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scores a completed execution with no history as 85", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(buildExecution());
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.score).toBe(93);
    expect(result.dimensions.completion).toBe(100);
    expect(result.dimensions.efficiency).toBe(75);
    expect(result.dimensions.errorRate).toBe(100);
    expect(result.dimensions.latency).toBe(75);
    expect(result.dimensions.approvalOverhead).toBe(100);
    expect(result.flags).toEqual([]);
  });

  it("scores a failed execution with 0 completion", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ status: "FAILED" })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.completion).toBe(0);
    expect(result.score).toBeLessThan(85);
  });

  it("scores a cancelled execution with 25 completion", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ status: "CANCELLED" })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.completion).toBe(25);
  });

  it("scores a timed-out execution with 10 completion and budget_exceeded flag", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ status: "TIMED_OUT" })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.completion).toBe(10);
    expect(result.flags).toContain("budget_exceeded");
  });

  it("calculates errorRate from failed steps", async () => {
    const now = new Date();
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({
        steps: [
          {
            id: "s1",
            executionId: "exec-1",
            nodeId: "n1",
            nodeType: "template",
            status: "COMPLETED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s2",
            executionId: "exec-1",
            nodeId: "n2",
            nodeType: "template",
            status: "FAILED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s3",
            executionId: "exec-1",
            nodeId: "n3",
            nodeType: "template",
            status: "FAILED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s4",
            executionId: "exec-1",
            nodeId: "n4",
            nodeType: "template",
            status: "COMPLETED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
        ],
      })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.errorRate).toBe(50);
  });

  it("flags high_error_rate when errorRate dimension < 50", async () => {
    const now = new Date();
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({
        steps: [
          {
            id: "s1",
            executionId: "exec-1",
            nodeId: "n1",
            nodeType: "template",
            status: "FAILED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s2",
            executionId: "exec-1",
            nodeId: "n2",
            nodeType: "template",
            status: "FAILED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s3",
            executionId: "exec-1",
            nodeId: "n3",
            nodeType: "template",
            status: "FAILED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
          {
            id: "s4",
            executionId: "exec-1",
            nodeId: "n4",
            nodeType: "template",
            status: "COMPLETED",
            latencyMs: null,
            input: null,
            output: null,
            error: null,
            startedAt: now,
            completedAt: now,
            createdAt: now,
            inputRef: null,
            outputRef: null,
          },
        ],
      })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.errorRate).toBe(25);
    expect(result.flags).toContain("high_error_rate");
  });

  it("compares efficiency against historical median", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ tokenUsage: { totalTokens: 2000 } as never })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue(
      buildHistorical([
        { latencyMs: 5000, tokenUsage: { totalTokens: 1000 } as never },
        { latencyMs: 5000, tokenUsage: { totalTokens: 1000 } as never },
        { latencyMs: 5000, tokenUsage: { totalTokens: 1000 } as never },
      ])
    );
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.efficiency).toBe(0);
  });

  it("gives 100 efficiency when under historical median", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ tokenUsage: { totalTokens: 500 } as never })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue(
      buildHistorical([
        { latencyMs: 5000, tokenUsage: { totalTokens: 1000 } as never },
        { latencyMs: 5000, tokenUsage: { totalTokens: 1000 } as never },
      ])
    );
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.efficiency).toBe(100);
  });

  it("compares latency against historical median", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ latencyMs: 10_000 })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue(
      buildHistorical([
        { latencyMs: 5000, tokenUsage: null as never },
        { latencyMs: 5000, tokenUsage: null as never },
      ])
    );
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.dimensions.latency).toBe(0);
  });

  it("flags no_steps when execution has no steps", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({ steps: [] })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.flags).toContain("no_steps");
  });

  it("flags approval_timeout when an approval expired", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({
        approvals: [{ id: "a1", status: "EXPIRED" }],
      })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(result.flags).toContain("approval_timeout");
  });

  it("stores eval result in database", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(buildExecution());
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(updateExecutionEval).toHaveBeenCalledWith(
      mockDb,
      "exec-1",
      "team-1",
      expect.objectContaining({
        evalScore: expect.any(Number),
        evalDimensions: expect.objectContaining({
          completion: expect.any(Number),
          efficiency: expect.any(Number),
          errorRate: expect.any(Number),
          latency: expect.any(Number),
          approvalOverhead: expect.any(Number),
        }),
        evalFlags: expect.any(Array),
      })
    );
  });

  it("emits prometheus metrics", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(buildExecution());
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    expect(recordEvalScore).toHaveBeenCalledWith(
      "canvas-1",
      "team-1",
      "COMPLETED",
      expect.any(Number)
    );
  });

  it("throws when execution not found", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(null);

    await expect(
      evaluate({
        executionId: "nonexistent",
        teamId: "team-1",
        canvasId: "canvas-1",
      })
    ).rejects.toThrow("Execution not found");
  });

  it("weighted score matches manual calculation for perfect execution", async () => {
    vi.mocked(getExecutionWithSteps).mockResolvedValue(
      buildExecution({
        tokenUsage: { totalTokens: 0 } as never,
        latencyMs: 0,
      })
    );
    vi.mocked(getRecentCompletedExecutions).mockResolvedValue([]);
    vi.mocked(updateExecutionEval).mockResolvedValue({} as never);

    const result = await evaluate({
      executionId: "exec-1",
      teamId: "team-1",
      canvasId: "canvas-1",
    });

    const expected = Math.round(
      100 * 0.3 + 75 * 0.2 + 100 * 0.3 + 75 * 0.1 + 100 * 0.1
    );
    expect(result.score).toBe(expected);
  });
});
