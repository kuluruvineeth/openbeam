import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAppendSessionEvent = vi.fn();
const mockPublishSessionRuntimeEvent = vi.fn();

vi.mock("@openplane/db", () => ({
  appendSessionEvent: (...args: unknown[]) => mockAppendSessionEvent(...args),
}));

vi.mock("@openplane/redis", () => ({
  publishSessionRuntimeEvent: (...args: unknown[]) =>
    mockPublishSessionRuntimeEvent(...args),
}));

import type { EmitContext } from "../runtime-event-emitter";
import { emitRuntimeEvent } from "../runtime-event-emitter";

function createContext(overrides?: Partial<EmitContext>): EmitContext {
  return {
    db: {} as EmitContext["db"],
    sessionId: "session_1",
    canvasId: "canvas_1",
    teamId: "team_1",
    executionId: "exec_1",
    ...overrides,
  };
}

describe("emitRuntimeEvent", () => {
  beforeEach(() => {
    mockAppendSessionEvent.mockReset();
    mockPublishSessionRuntimeEvent.mockReset();
    mockAppendSessionEvent.mockResolvedValue({ sequence: 42 });
    mockPublishSessionRuntimeEvent.mockResolvedValue(undefined);
  });

  it("persists event and publishes to Redis", async () => {
    const ctx = createContext();

    await emitRuntimeEvent(ctx, {
      type: "execution.started",
      executionId: "exec_1",
      status: "RUNNING",
    });

    expect(mockAppendSessionEvent).toHaveBeenCalledOnce();
    expect(mockPublishSessionRuntimeEvent).toHaveBeenCalledOnce();
  });

  it("passes correct fields to appendSessionEvent", async () => {
    const ctx = createContext({ turnId: "turn_1" });

    await emitRuntimeEvent(ctx, {
      type: "execution.progress",
      executionId: "exec_1",
      nodeId: "node_1",
      message: "Processing",
    });

    const [db, sessionId, event] = mockAppendSessionEvent.mock.calls[0] as [
      unknown,
      string,
      Record<string, unknown>,
    ];
    expect(db).toBe(ctx.db);
    expect(sessionId).toBe("session_1");
    expect(event.teamId).toBe("team_1");
    expect(event.agentCanvasId).toBe("canvas_1");
    expect(event.executionId).toBe("exec_1");
    expect(event.turnId).toBe("turn_1");
    expect(event.eventType).toBe("execution.progress");
    expect(event.source).toBe("system");
    expect(event.visibility).toBe("visible");
  });

  it("assigns persisted sequence to published event", async () => {
    mockAppendSessionEvent.mockResolvedValue({ sequence: 99 });
    const ctx = createContext();

    await emitRuntimeEvent(ctx, {
      type: "execution.completed",
      executionId: "exec_1",
      status: "COMPLETED",
    });

    const [sessionId, event] = mockPublishSessionRuntimeEvent.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(sessionId).toBe("session_1");
    expect(event.sequence).toBe(99);
  });

  it("resolves source to 'system' for execution events", async () => {
    const ctx = createContext();

    await emitRuntimeEvent(ctx, {
      type: "execution.started",
      executionId: "exec_1",
      status: "RUNNING",
    });

    const [, event] = mockPublishSessionRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(event.source).toBe("system");
  });

  it("resolves source to 'tool' for tool events", async () => {
    const ctx = createContext();

    await emitRuntimeEvent(ctx, {
      type: "tool.invoked" as never,
      executionId: "exec_1",
    } as never);

    const [, event] = mockPublishSessionRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(event.source).toBe("tool");
  });

  it("includes executionId and stepId on published event", async () => {
    const ctx = createContext({ stepId: "step_1" });

    await emitRuntimeEvent(ctx, {
      type: "execution.progress",
      executionId: "exec_1",
      nodeId: "node_1",
      message: "Started transform",
    });

    const [, event] = mockPublishSessionRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(event.executionId).toBe("exec_1");
    expect(event.stepId).toBe("step_1");
    expect(event.canvasId).toBe("canvas_1");
    expect(event.sessionId).toBe("session_1");
  });

  it("generates unique eventId", async () => {
    const ctx = createContext();

    await emitRuntimeEvent(ctx, {
      type: "execution.started",
      executionId: "exec_1",
      status: "RUNNING",
    });

    const [, event] = mockPublishSessionRuntimeEvent.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(event.eventId).toBeDefined();
    expect(typeof event.eventId).toBe("string");
    expect((event.eventId as string).length).toBeGreaterThan(0);
  });
});
