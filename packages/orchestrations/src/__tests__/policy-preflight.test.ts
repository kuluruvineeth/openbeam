import { describe, expect, it, mock } from "bun:test";
import type { StartCanvasExecutionDeps } from "../agent-canvas-execution";
import { createExecutionAndStartCanvasWorkflow } from "../agent-canvas-execution";

const baseParams = {
  prisma: {} as never,
  canvasId: "a0a0a0a0-b1b1-4c2c-9d3d-e4e4e4e4e4e4",
  versionNumber: 1,
  nodes: [
    {
      id: "node-1",
      type: "template",
      position: { x: 0, y: 0 },
      data: {},
    },
  ],
  edges: [],
  teamId: "b1b1b1b1-c2c2-4d3d-8e4e-f5f5f5f5f5f5",
  triggeredById: "c2c2c2c2-d3d3-4e4e-9f5f-a6a6a6a6a6a6",
};

const mockExecution = {
  id: "exec-1",
  agentCanvasId: baseParams.canvasId,
  versionNumber: 1,
  status: "PENDING",
  input: null,
  output: null,
  error: null,
  currentNodeId: null,
  trace: { steps: [] },
  workflowId: null,
  runId: null,
  temporalStatus: null,
  historyEventCount: null,
  historySizeBytes: null,
  continueAsNewCount: null,
  tokenUsage: null,
  latencyMs: null,
  triggeredById: baseParams.triggeredById,
  triggerSource: null,
  startedAt: null,
  completedAt: null,
  evalScore: null,
  evalDimensions: null,
  evalFlags: null,
  createdAt: new Date(),
};

function createMockDeps(
  overrides: Partial<StartCanvasExecutionDeps> = {}
): StartCanvasExecutionDeps {
  return {
    createAgentCanvasExecution: mock(async () => mockExecution) as never,
    updateAgentCanvasExecution: mock(
      async (
        _db: unknown,
        _id: unknown,
        _teamId: unknown,
        data: Record<string, unknown>
      ) => ({
        ...mockExecution,
        ...data,
      })
    ) as never,
    startCanvasExecution: mock(async () => ({
      workflowId: "canvas:exec-1",
      runId: "run-1",
    })),
    ...overrides,
  };
}

describe("createExecutionAndStartCanvasWorkflow", () => {
  it("creates execution and starts canvas workflow", async () => {
    const startExecution = mock(async () => ({
      workflowId: "canvas:exec-1",
      runId: "run-1",
    }));

    const deps = createMockDeps({
      startCanvasExecution: startExecution,
    });

    const result = await createExecutionAndStartCanvasWorkflow({
      ...baseParams,
      deps,
    });

    expect(startExecution).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("id");
  });

  it("passes canvas state to startCanvasExecution", async () => {
    const startExecution = mock(async () => ({
      workflowId: "canvas:exec-1",
      runId: "run-1",
    }));

    const deps = createMockDeps({
      startCanvasExecution: startExecution,
    });

    await createExecutionAndStartCanvasWorkflow({
      ...baseParams,
      deps,
    });

    const callArgs = (startExecution as ReturnType<typeof mock>).mock
      .calls[0]?.[0] as Record<string, unknown>;
    expect(callArgs).toHaveProperty("executionId");
    expect(callArgs).toHaveProperty("agentCanvasId");
    expect(callArgs).toHaveProperty("canvas");
  });

  it("updates execution to FAILED on start error", async () => {
    const updateExecution = mock(
      async (
        _db: unknown,
        _id: unknown,
        _teamId: unknown,
        data: Record<string, unknown>
      ) => ({
        ...mockExecution,
        ...data,
      })
    ) as never;

    const deps = createMockDeps({
      startCanvasExecution: mock(() => {
        throw new Error("Temporal unavailable");
      }),
      updateAgentCanvasExecution: updateExecution,
    });

    await expect(
      createExecutionAndStartCanvasWorkflow({
        ...baseParams,
        deps,
      })
    ).rejects.toThrow("Temporal unavailable");

    expect(updateExecution).toHaveBeenCalledTimes(1);
    const callArgs = (updateExecution as ReturnType<typeof mock>).mock
      .calls[0]?.[3] as Record<string, unknown>;
    expect(callArgs.status).toBe("FAILED");
  });

  it("updates execution to RUNNING on success", async () => {
    const deps = createMockDeps();

    const result = await createExecutionAndStartCanvasWorkflow({
      ...baseParams,
      deps,
    });

    expect(result.status).toBe("RUNNING");
  });
});
