import { describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { runtimeEventToExecutionEvent } from "../../utils/legacy-event-adapter";
import {
  isEphemeralEvent,
  mapBuilderEventToPayload,
} from "../../utils/runtime-event-mapping";

function createRuntimeEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: "evt-test-1",
    sequence: 42,
    timestamp: 1_700_000_000_000,
    canvasId: "canvas-abc",
    sessionId: "session-xyz",
    source: "system",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

describe("legacy adapter: execution event mapping", () => {
  it("maps execution.started to ExecutionStartedEvent", () => {
    const event = createRuntimeEvent({
      type: "execution.started",
      executionId: "exec-1",
      status: "RUNNING",
    });

    const result = runtimeEventToExecutionEvent(event);

    expect(result).toEqual({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-abc",
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.progress with nodeId to currentNodeId", () => {
    const event = createRuntimeEvent({
      type: "execution.progress",
      executionId: "exec-2",
      nodeId: "node-a",
      progress: 0.75,
    });

    const result = runtimeEventToExecutionEvent(event);

    expect(result).toEqual({
      type: "execution.progress",
      executionId: "exec-2",
      currentNodeId: "node-a",
      stepsCompleted: 0,
      stepsTotal: 0,
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.completed preserving durationMs", () => {
    const event = createRuntimeEvent({
      type: "execution.completed",
      executionId: "exec-3",
      status: "COMPLETED",
      durationMs: 12_345,
    });

    const result = runtimeEventToExecutionEvent(event);

    expect(result).toEqual({
      type: "execution.completed",
      executionId: "exec-3",
      status: "COMPLETED",
      durationMs: 12_345,
      timestamp: 1_700_000_000_000,
    });
  });

  it("defaults durationMs to 0 when absent on execution.completed", () => {
    const event = createRuntimeEvent({
      type: "execution.completed",
      executionId: "exec-4",
      status: "COMPLETED",
    });

    const result = runtimeEventToExecutionEvent(event);

    expect(result).toEqual({
      type: "execution.completed",
      executionId: "exec-4",
      status: "COMPLETED",
      durationMs: 0,
      timestamp: 1_700_000_000_000,
    });
  });

  it("maps execution.failed preserving error string", () => {
    const event = createRuntimeEvent({
      type: "execution.failed",
      executionId: "exec-5",
      error: "Activity timeout after 300s",
    });

    const result = runtimeEventToExecutionEvent(event);

    expect(result).toEqual({
      type: "execution.failed",
      executionId: "exec-5",
      error: "Activity timeout after 300s",
      timestamp: 1_700_000_000_000,
    });
  });
});

describe("legacy adapter: non-execution events return null", () => {
  const nonExecutionPayloads: Array<{
    label: string;
    payload: RuntimeEvent["payload"];
  }> = [
    {
      label: "chat.user_message",
      payload: { type: "chat.user_message", content: "hello" },
    },
    {
      label: "chat.assistant_delta",
      payload: { type: "chat.assistant_delta", chunk: "hi" },
    },
    {
      label: "chat.assistant_final",
      payload: { type: "chat.assistant_final", content: "done" },
    },
    {
      label: "chat.thinking",
      payload: { type: "chat.thinking", content: "reasoning" },
    },
    {
      label: "tool.call_start",
      payload: {
        type: "tool.call_start",
        toolCallId: "tc-1",
        toolName: "search_hybrid",
      },
    },
    {
      label: "tool.call_result",
      payload: {
        type: "tool.call_result",
        toolCallId: "tc-1",
        toolName: "search_hybrid",
        success: true,
      },
    },
    {
      label: "canvas.op_applied",
      payload: {
        type: "canvas.op_applied",
        operation: {
          type: "add_node",
          id: "n1",
          nodeType: "llm",
          timestamp: Date.now(),
          position: { x: 0, y: 0 },
        } as never,
      },
    },
    {
      label: "session.started",
      payload: { type: "session.started", sessionId: "s-1" },
    },
    {
      label: "session.resumed",
      payload: { type: "session.resumed", sessionId: "s-1", lastSequence: 10 },
    },
  ];

  for (const { label, payload } of nonExecutionPayloads) {
    it(`returns null for ${label}`, () => {
      const event = createRuntimeEvent(payload);
      expect(runtimeEventToExecutionEvent(event)).toBeNull();
    });
  }
});

describe("builder event mapping coverage", () => {
  it("maps thinking event to chat.thinking", () => {
    const result = mapBuilderEventToPayload({
      type: "thinking",
      content: "analyzing user intent",
    });

    expect(result).toEqual({
      type: "chat.thinking",
      content: "analyzing user intent",
    });
  });

  it("maps text event to chat.assistant_delta", () => {
    const result = mapBuilderEventToPayload({
      type: "text",
      chunk: "Here is a workflow",
    });

    expect(result).toEqual({
      type: "chat.assistant_delta",
      chunk: "Here is a workflow",
    });
  });

  it("maps tool_call event to tool.call_start with all fields", () => {
    const result = mapBuilderEventToPayload({
      type: "tool_call",
      tool: "canvas_add_edge",
      input: { source: "n1", target: "n2" },
      id: "tc-99",
    });

    expect(result).toEqual({
      type: "tool.call_start",
      toolCallId: "tc-99",
      toolName: "canvas_add_edge",
      toolInput: { source: "n1", target: "n2" },
    });
  });

  it("maps tool_result event to tool.call_result", () => {
    const result = mapBuilderEventToPayload({
      type: "tool_result",
      id: "tc-99",
      result: { nodeId: "n3" },
    });

    expect(result).toEqual({
      type: "tool.call_result",
      toolCallId: "tc-99",
      toolName: "",
      toolOutput: { nodeId: "n3" },
      success: true,
    });
  });

  it("maps tool_result event using tool_call context", () => {
    const toolNameByCallId = new Map<string, string>([
      ["tc-100", "canvas_add_node"],
    ]);

    const result = mapBuilderEventToPayload(
      {
        type: "tool_result",
        id: "tc-100",
        result: { nodeId: "n4" },
      },
      { toolNameByCallId }
    );

    expect(result).toEqual({
      type: "tool.call_result",
      toolCallId: "tc-100",
      toolName: "canvas_add_node",
      toolOutput: { nodeId: "n4" },
      success: true,
    });
  });

  it("maps canvas_op event to canvas.op_applied", () => {
    const operation = {
      type: "update_config" as const,
      id: "op-1",
      nodeId: "n1",
      timestamp: 1_700_000_000_000,
      config: { label: "Summarizer" } as Record<string, unknown>,
    };

    const result = mapBuilderEventToPayload({
      type: "canvas_op",
      operation,
    });

    expect(result).toEqual({
      type: "canvas.op_applied",
      operation,
    });
  });

  it("returns null for error event", () => {
    expect(
      mapBuilderEventToPayload({ type: "error", message: "rate limited" })
    ).toBeNull();
  });

  it("returns null for complete event", () => {
    expect(
      mapBuilderEventToPayload({
        type: "complete",
        summary: "finished",
        result: { output: "" } as never,
      })
    ).toBeNull();
  });
});

describe("ephemeral event classification", () => {
  const ephemeralTypes = [
    "chat.assistant_delta",
    "chat.thinking",
    "execution.progress",
  ];

  const durableTypes = [
    "chat.user_message",
    "chat.assistant_final",
    "tool.call_start",
    "tool.call_result",
    "canvas.op_applied",
    "canvas.op_rejected",
    "canvas.snapshot",
    "execution.started",
    "execution.completed",
    "execution.failed",
    "session.started",
    "session.resumed",
  ];

  for (const eventType of ephemeralTypes) {
    it(`classifies ${eventType} as ephemeral`, () => {
      expect(isEphemeralEvent(eventType)).toBe(true);
    });
  }

  for (const eventType of durableTypes) {
    it(`classifies ${eventType} as durable`, () => {
      expect(isEphemeralEvent(eventType)).toBe(false);
    });
  }

  it("classifies unknown event types as durable", () => {
    expect(isEphemeralEvent("unknown.event")).toBe(false);
    expect(isEphemeralEvent("")).toBe(false);
  });
});

describe("integration: RuntimeEvent through legacy adapter preserves fields", () => {
  it("preserves canvasId as agentCanvasId through started mapping", () => {
    const event = createRuntimeEvent(
      {
        type: "execution.started",
        executionId: "exec-int-1",
        status: "RUNNING",
      },
      { canvasId: "canvas-integration-test", timestamp: 1_700_500_000_000 }
    );

    const executionEvent = runtimeEventToExecutionEvent(event);

    expect(executionEvent).not.toBeNull();
    expect(executionEvent?.type).toBe("execution.started");
    expect(executionEvent?.timestamp).toBe(1_700_500_000_000);
    if (executionEvent?.type === "execution.started") {
      expect(executionEvent.agentCanvasId).toBe("canvas-integration-test");
      expect(executionEvent.executionId).toBe("exec-int-1");
    }
  });

  it("maps builder event through to legacy format", () => {
    const builderPayload = mapBuilderEventToPayload({
      type: "thinking",
      content: "deep reasoning",
    });

    expect(builderPayload).not.toBeNull();
    if (!builderPayload) {
      throw new Error("Expected non-null payload");
    }
    expect(builderPayload.type).toBe("chat.thinking");
    expect(isEphemeralEvent(builderPayload.type)).toBe(true);
    const event = createRuntimeEvent(builderPayload);
    const executionEvent = runtimeEventToExecutionEvent(event);

    expect(executionEvent).toBeNull();
  });

  it("maps builder tool_call through legacy adapter as null", () => {
    const builderPayload = mapBuilderEventToPayload({
      type: "tool_call",
      tool: "canvas_remove_node",
      input: { nodeId: "n5" },
      id: "tc-integration",
    });

    expect(builderPayload).not.toBeNull();
    if (!builderPayload) {
      throw new Error("Expected non-null payload");
    }
    expect(builderPayload.type).toBe("tool.call_start");
    expect(isEphemeralEvent(builderPayload.type)).toBe(false);
    const event = createRuntimeEvent(builderPayload);
    expect(runtimeEventToExecutionEvent(event)).toBeNull();
  });
});
