import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateStep = vi.fn();
const mockUpdateStep = vi.fn();
const mockEmitRuntimeEvent = vi.fn();

vi.mock("@openbeam/db", () => ({
  createAgentCanvasExecutionStep: (...args: unknown[]) =>
    mockCreateStep(...args),
  updateAgentCanvasExecutionStep: (...args: unknown[]) =>
    mockUpdateStep(...args),
}));

vi.mock("../../engine/claim-check", () => ({
  createDbClaimCheckStore: () => ({
    store: vi.fn(),
    resolve: vi.fn(),
  }),
  isExecutionDataRef: () => false,
  resolvePayload: vi.fn(),
  storePayload: vi.fn((payload: unknown) => payload),
}));

vi.mock("../runtime-event-emitter", () => ({
  emitRuntimeEvent: (...args: unknown[]) => mockEmitRuntimeEvent(...args),
}));

import {
  createCreateCanvasExecutionStepActivity,
  createUpdateCanvasExecutionStepActivity,
} from "../execution-step";

describe("createCanvasExecutionStep activity", () => {
  const db = {} as never;
  const createCanvasExecutionStep = createCreateCanvasExecutionStepActivity({
    db,
  });

  beforeEach(() => {
    mockCreateStep.mockReset();
    mockUpdateStep.mockReset();
    mockEmitRuntimeEvent.mockReset();
    mockCreateStep.mockResolvedValue({ id: "step_1" });
    mockEmitRuntimeEvent.mockResolvedValue(undefined);
  });

  it("emits execution.progress when sessionId present", async () => {
    await createCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      node: { id: "node_1", type: "transform" } as never,
      status: "RUNNING",
      sessionId: "session_1",
      canvasId: "canvas_1",
    });

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [ctx, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(ctx.sessionId).toBe("session_1");
    expect(ctx.canvasId).toBe("canvas_1");
    expect(ctx.stepId).toBe("step_1");
    expect(payload.type).toBe("execution.progress");
    expect(payload.nodeId).toBe("node_1");
    expect(payload.message).toBe("Started transform");
  });

  it("does not emit when sessionId absent", async () => {
    await createCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      node: { id: "node_1", type: "transform" } as never,
      status: "RUNNING",
    });

    expect(mockCreateStep).toHaveBeenCalledOnce();
    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });

  it("does not emit when canvasId absent", async () => {
    await createCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      node: { id: "node_1", type: "transform" } as never,
      status: "RUNNING",
      sessionId: "session_1",
    });

    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });
});

describe("updateCanvasExecutionStep activity", () => {
  const db = {} as never;
  const updateCanvasExecutionStep = createUpdateCanvasExecutionStepActivity({
    db,
  });

  beforeEach(() => {
    mockCreateStep.mockReset();
    mockUpdateStep.mockReset();
    mockEmitRuntimeEvent.mockReset();
    mockUpdateStep.mockResolvedValue(undefined);
    mockEmitRuntimeEvent.mockResolvedValue(undefined);
  });

  it("emits progress on COMPLETED with sessionId", async () => {
    await updateCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      stepId: "step_1",
      nodeId: "node_1",
      status: "COMPLETED",
      sessionId: "session_1",
      canvasId: "canvas_1",
    });

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [ctx, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(ctx.stepId).toBe("step_1");
    expect(payload.type).toBe("execution.progress");
    expect(payload.message).toBe("Completed node_1");
  });

  it("emits progress on FAILED with error message", async () => {
    await updateCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      stepId: "step_1",
      nodeId: "node_1",
      status: "FAILED",
      error: "Timeout exceeded",
      sessionId: "session_1",
      canvasId: "canvas_1",
    });

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.message).toBe("Failed node_1: Timeout exceeded");
  });

  it("does not emit on RUNNING status", async () => {
    await updateCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      stepId: "step_1",
      nodeId: "node_1",
      status: "RUNNING",
      sessionId: "session_1",
      canvasId: "canvas_1",
    });

    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });

  it("does not emit without sessionId", async () => {
    await updateCanvasExecutionStep({
      executionId: "exec_1",
      teamId: "team_1",
      stepId: "step_1",
      nodeId: "node_1",
      status: "COMPLETED",
    });

    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });
});
