import { describe, expect, it } from "bun:test";
import {
  CanvasOpAppliedPayloadSchema,
  ChatAssistantDeltaPayloadSchema,
  ChatAssistantFinalPayloadSchema,
  ChatThinkingPayloadSchema,
  ChatUserMessagePayloadSchema,
  ExecutionCompletedPayloadSchema,
  ExecutionFailedPayloadSchema,
  ExecutionProgressPayloadSchema,
  ExecutionStartedPayloadSchema,
  RUNTIME_EVENT_TYPES,
  RuntimeEventPayloadSchema,
  RuntimeEventSchema,
  SessionResumedPayloadSchema,
  SessionStartedPayloadSchema,
  ToolCallResultPayloadSchema,
  ToolCallStartPayloadSchema,
} from "../runtime-events";

describe("chat payload schemas", () => {
  it("validates chat.user_message", () => {
    const result = ChatUserMessagePayloadSchema.safeParse({
      type: "chat.user_message",
      content: "Build me a workflow",
    });
    expect(result.success).toBe(true);
  });

  it("validates chat.assistant_delta", () => {
    const result = ChatAssistantDeltaPayloadSchema.safeParse({
      type: "chat.assistant_delta",
      chunk: "I'll create",
    });
    expect(result.success).toBe(true);
  });

  it("validates chat.assistant_final with optional tokenUsage", () => {
    const withTokens = ChatAssistantFinalPayloadSchema.safeParse({
      type: "chat.assistant_final",
      content: "Here's your workflow",
      tokenUsage: { input: 100, output: 200 },
    });
    expect(withTokens.success).toBe(true);

    const withoutTokens = ChatAssistantFinalPayloadSchema.safeParse({
      type: "chat.assistant_final",
      content: "Done",
    });
    expect(withoutTokens.success).toBe(true);
  });

  it("validates chat.thinking", () => {
    const result = ChatThinkingPayloadSchema.safeParse({
      type: "chat.thinking",
      content: "Analyzing the request...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const result = ChatUserMessagePayloadSchema.safeParse({
      type: "chat.user_message",
    });
    expect(result.success).toBe(false);
  });
});

describe("tool payload schemas", () => {
  it("validates tool.call_start", () => {
    const result = ToolCallStartPayloadSchema.safeParse({
      type: "tool.call_start",
      toolCallId: "tc_001",
      toolName: "canvas_add_node",
      displayName: "Add Node",
      toolInput: { nodeType: "llm" },
    });
    expect(result.success).toBe(true);
  });

  it("validates tool.call_start with minimal fields", () => {
    const result = ToolCallStartPayloadSchema.safeParse({
      type: "tool.call_start",
      toolCallId: "tc_001",
      toolName: "search_hybrid",
    });
    expect(result.success).toBe(true);
  });

  it("validates tool.call_result", () => {
    const result = ToolCallResultPayloadSchema.safeParse({
      type: "tool.call_result",
      toolCallId: "tc_001",
      toolName: "canvas_add_node",
      success: true,
      durationMs: 150,
    });
    expect(result.success).toBe(true);
  });

  it("validates failed tool result", () => {
    const result = ToolCallResultPayloadSchema.safeParse({
      type: "tool.call_result",
      toolCallId: "tc_001",
      toolName: "search_hybrid",
      success: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("canvas payload schemas", () => {
  it("validates canvas.op_applied", () => {
    const result = CanvasOpAppliedPayloadSchema.safeParse({
      type: "canvas.op_applied",
      operation: {
        type: "add_node",
        id: "node_001",
        nodeType: "llm",
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("execution payload schemas", () => {
  it("validates execution.started", () => {
    const result = ExecutionStartedPayloadSchema.safeParse({
      type: "execution.started",
      executionId: "exec_001",
      status: "RUNNING",
    });
    expect(result.success).toBe(true);
  });

  it("validates execution.progress", () => {
    const result = ExecutionProgressPayloadSchema.safeParse({
      type: "execution.progress",
      executionId: "exec_001",
      progress: 0.5,
      message: "Processing nodes...",
    });
    expect(result.success).toBe(true);
  });

  it("validates execution.completed", () => {
    const result = ExecutionCompletedPayloadSchema.safeParse({
      type: "execution.completed",
      executionId: "exec_001",
      status: "COMPLETED",
      durationMs: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("validates execution.failed", () => {
    const result = ExecutionFailedPayloadSchema.safeParse({
      type: "execution.failed",
      executionId: "exec_001",
      error: "Timeout exceeded",
      retryable: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("session payload schemas", () => {
  it("validates session.started", () => {
    const result = SessionStartedPayloadSchema.safeParse({
      type: "session.started",
      sessionId: "session_001",
    });
    expect(result.success).toBe(true);
  });

  it("validates session.resumed", () => {
    const result = SessionResumedPayloadSchema.safeParse({
      type: "session.resumed",
      sessionId: "session_001",
      lastSequence: 42,
    });
    expect(result.success).toBe(true);
  });
});

describe("RuntimeEventPayloadSchema discriminated union", () => {
  it("dispatches to correct schema by type", () => {
    const chatPayload = RuntimeEventPayloadSchema.safeParse({
      type: "chat.user_message",
      content: "Hello",
    });
    expect(chatPayload.success).toBe(true);

    const toolPayload = RuntimeEventPayloadSchema.safeParse({
      type: "tool.call_start",
      toolCallId: "tc_001",
      toolName: "search",
    });
    expect(toolPayload.success).toBe(true);
  });

  it("rejects invalid type discriminator", () => {
    const result = RuntimeEventPayloadSchema.safeParse({
      type: "invalid.event_type",
      content: "something",
    });
    expect(result.success).toBe(false);
  });

  it("rejects valid type with wrong fields", () => {
    const result = RuntimeEventPayloadSchema.safeParse({
      type: "chat.user_message",
    });
    expect(result.success).toBe(false);
  });
});

describe("RuntimeEventSchema envelope", () => {
  it("validates a full chat event envelope", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_001",
      sequence: 1,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      turnId: "turn_001",
      source: "user",
      visibility: "visible",
      payload: {
        type: "chat.user_message",
        content: "Build a search workflow",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates a tool event envelope", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_002",
      sequence: 2,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      executionId: "exec_001",
      toolCallId: "tc_001",
      source: "agent",
      visibility: "visible",
      payload: {
        type: "tool.call_start",
        toolCallId: "tc_001",
        toolName: "canvas_add_node",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates execution event with ephemeral visibility", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_003",
      sequence: 3,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      source: "system",
      visibility: "ephemeral",
      payload: {
        type: "execution.progress",
        executionId: "exec_001",
        progress: 0.75,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative sequence", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_001",
      sequence: -1,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      source: "user",
      visibility: "visible",
      payload: {
        type: "chat.user_message",
        content: "test",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_001",
      sequence: 0,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      source: "unknown_source",
      visibility: "visible",
      payload: {
        type: "chat.user_message",
        content: "test",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid visibility", () => {
    const result = RuntimeEventSchema.safeParse({
      eventId: "evt_001",
      sequence: 0,
      timestamp: Date.now(),
      canvasId: "canvas_001",
      sessionId: "session_001",
      source: "user",
      visibility: "secret",
      payload: {
        type: "chat.user_message",
        content: "test",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("RUNTIME_EVENT_TYPES", () => {
  it("contains 15 event types", () => {
    expect(RUNTIME_EVENT_TYPES).toHaveLength(15);
  });

  it("includes all chat types", () => {
    expect(RUNTIME_EVENT_TYPES).toContain("chat.user_message");
    expect(RUNTIME_EVENT_TYPES).toContain("chat.assistant_delta");
    expect(RUNTIME_EVENT_TYPES).toContain("chat.assistant_final");
    expect(RUNTIME_EVENT_TYPES).toContain("chat.thinking");
  });

  it("includes all tool types", () => {
    expect(RUNTIME_EVENT_TYPES).toContain("tool.call_start");
    expect(RUNTIME_EVENT_TYPES).toContain("tool.call_result");
  });

  it("includes all canvas types", () => {
    expect(RUNTIME_EVENT_TYPES).toContain("canvas.op_applied");
    expect(RUNTIME_EVENT_TYPES).toContain("canvas.op_rejected");
    expect(RUNTIME_EVENT_TYPES).toContain("canvas.snapshot");
  });

  it("includes all execution types", () => {
    expect(RUNTIME_EVENT_TYPES).toContain("execution.started");
    expect(RUNTIME_EVENT_TYPES).toContain("execution.progress");
    expect(RUNTIME_EVENT_TYPES).toContain("execution.completed");
    expect(RUNTIME_EVENT_TYPES).toContain("execution.failed");
  });

  it("includes all session types", () => {
    expect(RUNTIME_EVENT_TYPES).toContain("session.started");
    expect(RUNTIME_EVENT_TYPES).toContain("session.resumed");
  });
});
