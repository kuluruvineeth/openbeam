import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateExecution = vi.fn();
const mockEmitRuntimeEvent = vi.fn();

vi.mock("@openbeam/db", () => ({
  updateAgentCanvasExecution: (...args: unknown[]) =>
    mockUpdateExecution(...args),
}));

vi.mock("../runtime-event-emitter", () => ({
  emitRuntimeEvent: (...args: unknown[]) => mockEmitRuntimeEvent(...args),
}));

import type { UpdateCanvasExecutionInput } from "@openbeam/types/temporal";
import { createUpdateCanvasExecutionActivity } from "../update-execution";

function createInput(
  overrides?: Partial<UpdateCanvasExecutionInput>
): UpdateCanvasExecutionInput {
  return {
    executionId: "exec_1",
    teamId: "team_1",
    ...overrides,
  };
}

describe("updateCanvasExecution activity", () => {
  const db = {} as never;
  const updateCanvasExecution = createUpdateCanvasExecutionActivity({ db });

  beforeEach(() => {
    mockUpdateExecution.mockReset();
    mockEmitRuntimeEvent.mockReset();
    mockUpdateExecution.mockResolvedValue(undefined);
    mockEmitRuntimeEvent.mockResolvedValue(undefined);
  });

  it("updates DB without emitting when sessionId is absent", async () => {
    await updateCanvasExecution(createInput({ status: "RUNNING" }));

    expect(mockUpdateExecution).toHaveBeenCalledOnce();
    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });

  it("does not emit when canvasId is absent", async () => {
    await updateCanvasExecution(
      createInput({ status: "RUNNING", sessionId: "session_1" })
    );

    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });

  it("does not emit when status is undefined", async () => {
    await updateCanvasExecution(
      createInput({ sessionId: "session_1", canvasId: "canvas_1" })
    );

    expect(mockEmitRuntimeEvent).not.toHaveBeenCalled();
  });

  it("emits execution.started for RUNNING status", async () => {
    await updateCanvasExecution(
      createInput({
        status: "RUNNING",
        sessionId: "session_1",
        canvasId: "canvas_1",
      })
    );

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.type).toBe("execution.started");
    expect(payload.executionId).toBe("exec_1");
    expect(payload.status).toBe("RUNNING");
  });

  it("emits execution.completed with durationMs", async () => {
    await updateCanvasExecution(
      createInput({
        status: "COMPLETED",
        sessionId: "session_1",
        canvasId: "canvas_1",
        latencyMs: 1500,
      })
    );

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.type).toBe("execution.completed");
    expect(payload.durationMs).toBe(1500);
  });

  it("emits execution.failed with error message", async () => {
    await updateCanvasExecution(
      createInput({
        status: "FAILED",
        sessionId: "session_1",
        canvasId: "canvas_1",
        error: "Node transform_1 failed",
      })
    );

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.type).toBe("execution.failed");
    expect(payload.error).toBe("Node transform_1 failed");
  });

  it("emits execution.failed for CANCELLED status", async () => {
    await updateCanvasExecution(
      createInput({
        status: "CANCELLED",
        sessionId: "session_1",
        canvasId: "canvas_1",
      })
    );

    expect(mockEmitRuntimeEvent).toHaveBeenCalledOnce();
    const [, payload] = mockEmitRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.type).toBe("execution.failed");
    expect(payload.error).toBe("Execution cancelled");
  });

  it("passes correct context to emitter", async () => {
    await updateCanvasExecution(
      createInput({
        status: "RUNNING",
        sessionId: "session_1",
        canvasId: "canvas_1",
        turnId: "turn_1",
      })
    );

    const [ctx] = mockEmitRuntimeEvent.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(ctx.db).toBe(db);
    expect(ctx.sessionId).toBe("session_1");
    expect(ctx.canvasId).toBe("canvas_1");
    expect(ctx.teamId).toBe("team_1");
    expect(ctx.executionId).toBe("exec_1");
    expect(ctx.turnId).toBe("turn_1");
  });
});
