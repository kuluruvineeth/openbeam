import { describe, expect, it, mock } from "bun:test";
import type { AgentCanvasExecution } from "@openplane/types/db/agent-canvas";
import { createExecutionAndStartCanvasWorkflow } from "../agent-canvas-execution";

const baseParams = {
  prisma: {} as never,
  canvasId: "canvas-1",
  versionNumber: 2,
  nodes: [{ id: "n1", position: { x: 0, y: 0 }, data: {} }],
  edges: [{ id: "e1", source: "n1", target: "n1" }],
  input: { message: "hello" },
  teamId: "team-1",
  triggeredById: "user-1",
};

const mockExecution: AgentCanvasExecution = {
  id: "exec-1",
  agentCanvasId: "canvas-1",
  versionNumber: 2,
  status: "PENDING",
  currentNodeId: null,
  input: null,
  output: null,
  error: null,
  trace: { steps: [] },
  tokenUsage: null,
  latencyMs: null,
  startedAt: null,
  completedAt: null,
  triggeredById: "user-1",
  triggerSource: null,
  workflowId: null,
  runId: null,
  temporalStatus: null,
  historyEventCount: null,
  historySizeBytes: null,
  continueAsNewCount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createExecutionAndStartCanvasWorkflow", () => {
  it("creates execution, starts workflow, updates execution", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(async (input) => ({
      workflowId: `canvas:${input.executionId}`,
      runId: "run-1",
    }));

    const result = await createExecutionAndStartCanvasWorkflow({
      deps: {
        createAgentCanvasExecution: createExecution as any,
        updateAgentCanvasExecution: updateExecution as any,
        startCanvasExecution: startExecution as any,
      },
      ...baseParams,
    });

    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(startExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 2,
        teamId: "team-1",
        triggeredById: "user-1",
        input: { message: "hello" },
        canvas: {
          nodes: [{ id: "n1", position: { x: 0, y: 0 }, data: {} }],
          edges: [{ id: "e1", source: "n1", target: "n1" }],
        },
      })
    );
    expect(updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      "exec-1",
      "team-1",
      expect.objectContaining({
        status: "RUNNING",
        workflowId: "canvas:exec-1",
        runId: "run-1",
        temporalStatus: "RUNNING",
      })
    );
    expect(result.status).toBe("RUNNING");
    expect(result.workflowId).toBe("canvas:exec-1");
  });

  it("marks execution failed when workflow start throws", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(() =>
      Promise.reject(new Error("Temporal unavailable"))
    );

    await expect(
      createExecutionAndStartCanvasWorkflow({
        deps: {
          createAgentCanvasExecution: createExecution as any,
          updateAgentCanvasExecution: updateExecution as any,
          startCanvasExecution: startExecution as any,
        },
        ...baseParams,
      })
    ).rejects.toThrow("Temporal unavailable");

    expect(updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      "exec-1",
      "team-1",
      expect.objectContaining({
        status: "FAILED",
        error: expect.stringContaining("Temporal unavailable"),
      })
    );
  });

  it("handles optional viewport", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(async (input) => ({
      workflowId: `canvas:${input.executionId}`,
      runId: "run-1",
    }));

    await createExecutionAndStartCanvasWorkflow({
      deps: {
        createAgentCanvasExecution: createExecution as any,
        updateAgentCanvasExecution: updateExecution as any,
        startCanvasExecution: startExecution as any,
      },
      ...baseParams,
      viewport: { x: 100, y: 200, zoom: 1 },
    });

    expect(startExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas: expect.objectContaining({
          viewport: { x: 100, y: 200, zoom: 1 },
        }),
      })
    );
  });

  it("handles optional triggerSource", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(async (input) => ({
      workflowId: `canvas:${input.executionId}`,
      runId: "run-1",
    }));

    await createExecutionAndStartCanvasWorkflow({
      deps: {
        createAgentCanvasExecution: createExecution as any,
        updateAgentCanvasExecution: updateExecution as any,
        startCanvasExecution: startExecution as any,
      },
      ...baseParams,
      triggerSource: "manual",
    });

    expect(createExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        triggerSource: "manual",
      })
    );
  });

  it("preserves error context on failure", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));

    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }

    const startExecution = mock(() =>
      Promise.reject(new CustomError("Custom failure"))
    );

    await expect(
      createExecutionAndStartCanvasWorkflow({
        deps: {
          createAgentCanvasExecution: createExecution as any,
          updateAgentCanvasExecution: updateExecution as any,
          startCanvasExecution: startExecution as any,
        },
        ...baseParams,
      })
    ).rejects.toThrow("Custom failure");

    expect(updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      "exec-1",
      "team-1",
      expect.objectContaining({
        status: "FAILED",
        error: expect.stringContaining('"type":"CustomError"'),
      })
    );
  });

  it("validates positive versionNumber", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(async (input) => ({
      workflowId: `canvas:${input.executionId}`,
      runId: "run-1",
    }));

    await expect(
      createExecutionAndStartCanvasWorkflow({
        deps: {
          createAgentCanvasExecution: createExecution as any,
          updateAgentCanvasExecution: updateExecution as any,
          startCanvasExecution: startExecution as any,
        },
        ...baseParams,
        versionNumber: 0,
      })
    ).rejects.toThrow();
  });

  it("handles non-Error exceptions", async () => {
    const createExecution = mock(async (_db, _data) => mockExecution);
    const updateExecution = mock(async (_db, _id, _teamId, data) => ({
      ...mockExecution,
      ...data,
    }));
    const startExecution = mock(() => Promise.reject("string error"));

    await expect(
      createExecutionAndStartCanvasWorkflow({
        deps: {
          createAgentCanvasExecution: createExecution as any,
          updateAgentCanvasExecution: updateExecution as any,
          startCanvasExecution: startExecution as any,
        },
        ...baseParams,
      })
    ).rejects.toBe("string error");

    expect(updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      "exec-1",
      "team-1",
      expect.objectContaining({
        status: "FAILED",
        error: expect.stringContaining('"message":"string error"'),
      })
    );
  });
});
