import { describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { RuntimeEventSchema } from "@openbeam/types/canvas/runtime-events";
import { cleanupSessionThrottleCache } from "../session-events";

function createTestEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<Omit<RuntimeEvent, "payload">>
): RuntimeEvent {
  return {
    eventId: `evt_${crypto.randomUUID()}`,
    sequence: 1,
    timestamp: Date.now(),
    canvasId: "canvas_test",
    sessionId: "session_test",
    source: "agent",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

describe("RuntimeEvent serialization roundtrip", () => {
  it("roundtrips chat.user_message through JSON", () => {
    const event = createTestEvent({
      type: "chat.user_message",
      content: "Hello, build me a workflow",
    });

    const serialized = JSON.stringify(event);
    const deserialized = JSON.parse(serialized);
    const validated = RuntimeEventSchema.parse(deserialized);

    expect(validated.eventId).toBe(event.eventId);
    expect(validated.payload.type).toBe("chat.user_message");
    expect(
      (validated.payload as { type: "chat.user_message"; content: string })
        .content
    ).toBe("Hello, build me a workflow");
  });

  it("roundtrips tool.call_start through JSON", () => {
    const event = createTestEvent({
      type: "tool.call_start",
      toolCallId: "tc_1",
      toolName: "search_hybrid",
      displayName: "Search",
      toolInput: { query: "test" },
      redacted: false,
    });

    const serialized = JSON.stringify(event);
    const deserialized = JSON.parse(serialized);
    const validated = RuntimeEventSchema.parse(deserialized);

    expect(validated.payload.type).toBe("tool.call_start");
    expect(
      (
        validated.payload as {
          type: "tool.call_start";
          toolCallId: string;
          toolName: string;
        }
      ).toolName
    ).toBe("search_hybrid");
  });

  it("roundtrips execution.started through JSON", () => {
    const event = createTestEvent(
      {
        type: "execution.started",
        executionId: "exec_123",
        status: "RUNNING",
      },
      { executionId: "exec_123" }
    );

    const serialized = JSON.stringify(event);
    const deserialized = JSON.parse(serialized);
    const validated = RuntimeEventSchema.parse(deserialized);

    expect(validated.payload.type).toBe("execution.started");
    expect(validated.executionId).toBe("exec_123");
    expect(
      (
        validated.payload as {
          type: "execution.started";
          status: string;
        }
      ).status
    ).toBe("RUNNING");
  });

  it("roundtrips execution.completed through JSON", () => {
    const event = createTestEvent(
      {
        type: "execution.completed",
        executionId: "exec_456",
        status: "COMPLETED",
        durationMs: 1500,
      },
      { executionId: "exec_456" }
    );

    const serialized = JSON.stringify(event);
    const deserialized = JSON.parse(serialized);
    const validated = RuntimeEventSchema.parse(deserialized);

    expect(validated.payload.type).toBe("execution.completed");
    expect(
      (
        validated.payload as {
          type: "execution.completed";
          durationMs?: number;
        }
      ).durationMs
    ).toBe(1500);
  });

  it("preserves optional envelope fields across roundtrip", () => {
    const event = createTestEvent(
      {
        type: "tool.call_result",
        toolCallId: "tc_3",
        toolName: "doc_get",
        success: true,
        durationMs: 42,
      },
      {
        workspaceId: "ws_1",
        turnId: "turn_1",
        executionId: "exec_1",
        stepId: "step_1",
        toolCallId: "tc_3",
      }
    );

    const validated = RuntimeEventSchema.parse(
      JSON.parse(JSON.stringify(event))
    );

    expect(validated.workspaceId).toBe("ws_1");
    expect(validated.turnId).toBe("turn_1");
    expect(validated.executionId).toBe("exec_1");
    expect(validated.stepId).toBe("step_1");
    expect(validated.toolCallId).toBe("tc_3");
  });
});

describe("RuntimeEvent schema validation", () => {
  it("rejects event missing eventId", () => {
    const malformed = {
      sequence: 1,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "agent",
      visibility: "visible",
      payload: { type: "chat.user_message", content: "hi" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("rejects event with invalid payload type", () => {
    const malformed = {
      eventId: "evt_1",
      sequence: 1,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "agent",
      visibility: "visible",
      payload: { type: "nonexistent.event_type" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("rejects event with negative sequence", () => {
    const malformed = {
      eventId: "evt_1",
      sequence: -1,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "agent",
      visibility: "visible",
      payload: { type: "chat.user_message", content: "hi" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("rejects event with invalid source", () => {
    const malformed = {
      eventId: "evt_1",
      sequence: 0,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "unknown_source",
      visibility: "visible",
      payload: { type: "chat.user_message", content: "hi" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("rejects event with invalid visibility", () => {
    const malformed = {
      eventId: "evt_1",
      sequence: 0,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "agent",
      visibility: "secret",
      payload: { type: "chat.user_message", content: "hi" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("rejects tool.call_start missing required toolCallId", () => {
    const malformed = {
      eventId: "evt_1",
      sequence: 0,
      timestamp: Date.now(),
      canvasId: "c1",
      sessionId: "s1",
      source: "tool",
      visibility: "visible",
      payload: { type: "tool.call_start", toolName: "search" },
    };

    expect(() => RuntimeEventSchema.parse(malformed)).toThrow();
  });

  it("accepts event with sequence zero", () => {
    const event = createTestEvent(
      { type: "session.started", sessionId: "s1" },
      { sequence: 0 }
    );

    const validated = RuntimeEventSchema.parse(event);
    expect(validated.sequence).toBe(0);
  });

  it("accepts all valid source types", () => {
    for (const source of ["user", "agent", "system", "tool"] as const) {
      const event = createTestEvent(
        { type: "chat.user_message", content: "x" },
        { source }
      );

      const validated = RuntimeEventSchema.parse(event);
      expect(validated.source).toBe(source);
    }
  });

  it("accepts all valid visibility types", () => {
    for (const visibility of ["visible", "ephemeral", "hidden"] as const) {
      const event = createTestEvent(
        { type: "chat.user_message", content: "x" },
        { visibility }
      );

      const validated = RuntimeEventSchema.parse(event);
      expect(validated.visibility).toBe(visibility);
    }
  });
});

describe("cleanupSessionThrottleCache", () => {
  it("does not throw for unknown session", () => {
    expect(() =>
      cleanupSessionThrottleCache("nonexistent_session")
    ).not.toThrow();
  });

  it("can be called multiple times for the same session", () => {
    expect(() => {
      cleanupSessionThrottleCache("repeated_session");
      cleanupSessionThrottleCache("repeated_session");
      cleanupSessionThrottleCache("repeated_session");
    }).not.toThrow();
  });
});
