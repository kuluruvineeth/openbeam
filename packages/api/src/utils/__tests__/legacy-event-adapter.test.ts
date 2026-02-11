import { describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import { runtimeEventToExecutionEvent } from "../legacy-event-adapter";

function createEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: "evt-1",
    sequence: 1,
    timestamp: 1_700_000_000_000,
    canvasId: "canvas-1",
    sessionId: "session-1",
    source: "system",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

describe("runtimeEventToExecutionEvent", () => {
  it("maps execution.started with correct fields", () => {
    const event = createEvent({
      type: "execution.started",
      executionId: "exec-1",
      status: "RUNNING",
    });

    expect(runtimeEventToExecutionEvent(event)).toEqual({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.progress with nodeId as currentNodeId", () => {
    const event = createEvent({
      type: "execution.progress",
      executionId: "exec-1",
      nodeId: "node-5",
      progress: 0.5,
    });

    expect(runtimeEventToExecutionEvent(event)).toEqual({
      type: "execution.progress",
      executionId: "exec-1",
      currentNodeId: "node-5",
      stepsCompleted: 0,
      stepsTotal: 0,
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.completed with status and durationMs", () => {
    const event = createEvent({
      type: "execution.completed",
      executionId: "exec-1",
      status: "COMPLETED",
      durationMs: 4500,
    });

    expect(runtimeEventToExecutionEvent(event)).toEqual({
      type: "execution.completed",
      executionId: "exec-1",
      status: "COMPLETED",
      durationMs: 4500,
      timestamp: 1_700_000_000_000,
    });
  });

  it("defaults durationMs to 0 when absent on execution.completed", () => {
    const event = createEvent({
      type: "execution.completed",
      executionId: "exec-1",
      status: "COMPLETED",
    });

    const result = runtimeEventToExecutionEvent(event);
    expect(result).toEqual({
      type: "execution.completed",
      executionId: "exec-1",
      status: "COMPLETED",
      durationMs: 0,
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.failed with error string", () => {
    const event = createEvent({
      type: "execution.failed",
      executionId: "exec-1",
      error: "Node timeout exceeded",
    });

    expect(runtimeEventToExecutionEvent(event)).toEqual({
      type: "execution.failed",
      executionId: "exec-1",
      error: "Node timeout exceeded",
      timestamp: 1_700_000_000_000,
    });
  });

  it("returns null for chat.assistant_delta", () => {
    const event = createEvent({
      type: "chat.assistant_delta",
      chunk: "hello",
    });

    expect(runtimeEventToExecutionEvent(event)).toBeNull();
  });

  it("returns null for tool.call_start", () => {
    const event = createEvent({
      type: "tool.call_start",
      toolCallId: "tc-1",
      toolName: "search_hybrid",
    });

    expect(runtimeEventToExecutionEvent(event)).toBeNull();
  });

  it("returns null for canvas.op_applied", () => {
    const event = createEvent({
      type: "canvas.op_applied",
      operation: {
        type: "add_node",
        id: "n1",
        nodeType: "llm",
        timestamp: Date.now(),
        position: { x: 0, y: 0 },
      } as never,
    });

    expect(runtimeEventToExecutionEvent(event)).toBeNull();
  });

  it("returns null for session.started", () => {
    const event = createEvent({
      type: "session.started",
      sessionId: "session-1",
    });

    expect(runtimeEventToExecutionEvent(event)).toBeNull();
  });
});
