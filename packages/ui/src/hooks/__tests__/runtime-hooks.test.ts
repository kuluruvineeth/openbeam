import { describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import { projectRuntimeEventsToMessages } from "../use-runtime-agent-messages";
import { projectRuntimeEventsToTimeline } from "../use-runtime-timeline";

function createEvent(
  payload: { type: string; [key: string]: unknown },
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
    sequence: 0,
    timestamp: Date.now(),
    canvasId: "canvas-1",
    sessionId: "sess-1",
    source: "system",
    visibility: "visible",
    payload: payload as RuntimeEvent["payload"],
    ...overrides,
  };
}

describe("projectRuntimeEventsToTimeline", () => {
  it("returns null when no events match executionId", () => {
    const events = [
      createEvent(
        {
          type: "execution.started",
          executionId: "exec-other",
          status: "RUNNING",
        },
        { executionId: "exec-other", sequence: 0 }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-missing");

    expect(result).toBeNull();
  });

  it("creates TimelineData from execution.started event", () => {
    const startTime = 1_700_000_000_000;
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0, timestamp: startTime }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.executionId).toBe("exec-1");
    expect(result?.status).toBe("RUNNING");
    expect(result?.startedAt).toBe(startTime);
    expect(result?.completedAt).toBeUndefined();
    expect(result?.totalDurationMs).toBeUndefined();
  });

  it("tracks execution.progress with nodeId", () => {
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        {
          type: "execution.progress",
          executionId: "exec-1",
          nodeId: "node-abc",
          progress: 0.5,
          message: "Processing node",
        },
        { executionId: "exec-1", sequence: 1 }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("RUNNING");
    const progressEvent = result?.events.find((e) => e.nodeId === "node-abc");
    expect(progressEvent).toBeDefined();
    expect(progressEvent?.message).toBe("Processing node");
  });

  it("sets completed status and durationMs from execution.completed", () => {
    const startTime = 1_700_000_000_000;
    const endTime = 1_700_000_005_000;
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0, timestamp: startTime }
      ),
      createEvent(
        {
          type: "execution.completed",
          executionId: "exec-1",
          status: "COMPLETED",
          durationMs: 5000,
        },
        { executionId: "exec-1", sequence: 1, timestamp: endTime }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("COMPLETED");
    expect(result?.completedAt).toBe(endTime);
    expect(result?.totalDurationMs).toBe(5000);
  });

  it("sets error status from execution.failed", () => {
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        {
          type: "execution.failed",
          executionId: "exec-1",
          error: "Something went wrong",
          retryable: false,
        },
        { executionId: "exec-1", sequence: 1 }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("FAILED");
  });

  it("maps tool.call_start to a timeline step", () => {
    const toolStartTime = 1_700_000_001_000;
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-1",
          toolName: "search_hybrid",
          displayName: "Hybrid Search",
          toolInput: { query: "test" },
        },
        {
          executionId: "exec-1",
          sequence: 1,
          timestamp: toolStartTime,
          toolCallId: "tc-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.steps.length).toBe(1);
    const step = result?.steps[0];
    expect(step?.nodeType).toBe("search_hybrid");
    expect(step?.nodeName).toBe("Hybrid Search");
    expect(step?.status).toBe("running");
    expect(step?.startedAt).toBe(toolStartTime);
    expect(step?.input).toEqual({ query: "test" });
  });

  it("completes timeline step on tool.call_result", () => {
    const toolStartTime = 1_700_000_001_000;
    const toolEndTime = 1_700_000_002_000;
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-1",
          toolName: "search_hybrid",
          toolInput: { query: "test" },
        },
        {
          executionId: "exec-1",
          sequence: 1,
          timestamp: toolStartTime,
          toolCallId: "tc-1",
        }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc-1",
          toolName: "search_hybrid",
          toolOutput: { results: [] },
          durationMs: 1000,
          success: true,
        },
        {
          executionId: "exec-1",
          sequence: 2,
          timestamp: toolEndTime,
          toolCallId: "tc-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.steps.length).toBe(1);
    const step = result?.steps[0];
    expect(step?.status).toBe("success");
    expect(step?.completedAt).toBe(toolEndTime);
    expect(step?.durationMs).toBe(1000);
    expect(step?.output).toEqual({ results: [] });
  });

  it("computes progress percentage correctly", () => {
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-1",
          toolName: "tool_a",
        },
        {
          executionId: "exec-1",
          sequence: 1,
          toolCallId: "tc-1",
          timestamp: 1000,
        }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc-1",
          toolName: "tool_a",
          success: true,
        },
        {
          executionId: "exec-1",
          sequence: 2,
          toolCallId: "tc-1",
          timestamp: 2000,
        }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-2",
          toolName: "tool_b",
        },
        {
          executionId: "exec-1",
          sequence: 3,
          toolCallId: "tc-2",
          timestamp: 3000,
        }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc-2",
          toolName: "tool_b",
          success: true,
        },
        {
          executionId: "exec-1",
          sequence: 4,
          toolCallId: "tc-2",
          timestamp: 4000,
        }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-3",
          toolName: "tool_c",
        },
        {
          executionId: "exec-1",
          sequence: 5,
          toolCallId: "tc-3",
          timestamp: 5000,
        }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.progress.total).toBe(3);
    expect(result?.progress.completed).toBe(2);
    expect(result?.progress.percentage).toBe(67);
  });

  it("ignores non-execution events", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "hello" },
        { executionId: "exec-1", sequence: 0 }
      ),
      createEvent(
        { type: "canvas.snapshot", nodes: [], edges: [] },
        { executionId: "exec-1", sequence: 1 }
      ),
      createEvent(
        { type: "session.started", sessionId: "sess-1" },
        { executionId: "exec-1", sequence: 3 }
      ),
    ];

    const result = projectRuntimeEventsToTimeline(events, "exec-1");

    expect(result).not.toBeNull();
    expect(result?.steps.length).toBe(0);
    expect(result?.events.length).toBe(0);
  });
});

describe("projectRuntimeEventsToMessages", () => {
  it("returns empty array for empty events", () => {
    const result = projectRuntimeEventsToMessages([]);

    expect(result).toEqual([]);
  });

  it("groups user message and assistant response by turnId", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "What is AI?" },
        { turnId: "turn-1", sequence: 0, source: "user", timestamp: 1000 }
      ),
      createEvent(
        {
          type: "chat.assistant_final",
          content: "AI is artificial intelligence.",
        },
        { turnId: "turn-1", sequence: 1, source: "agent", timestamp: 2000 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(2);
    const userMsg = result[0];
    const assistantMsg = result[1];
    expect(userMsg?.role).toBe("user");
    expect(userMsg?.id).toBe("turn-1-user");
    expect(userMsg?.events.length).toBe(1);
    expect(userMsg?.events[0]?.type).toBe("text");
    expect(assistantMsg?.role).toBe("assistant");
    expect(assistantMsg?.id).toBe("turn-1-assistant");
    expect(assistantMsg?.events.length).toBe(1);
    expect(assistantMsg?.events[0]?.type).toBe("text");
  });

  it("handles assistant delta streaming with isPartial=true", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "Hello " },
        { turnId: "turn-1", sequence: 0, source: "agent", timestamp: 1000 }
      ),
      createEvent(
        { type: "chat.assistant_delta", chunk: "world" },
        { turnId: "turn-1", sequence: 1, source: "agent", timestamp: 1100 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const streamMsg = result[0];
    expect(streamMsg?.role).toBe("assistant");
    expect(streamMsg?.events.length).toBe(2);
    const firstEvent = streamMsg?.events[0];
    expect(firstEvent?.type).toBe("text");
    if (firstEvent?.type === "text") {
      expect(firstEvent.isPartial).toBe(true);
      expect(firstEvent.content).toBe("Hello ");
    }
  });

  it("marks turn complete on chat.assistant_final", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "streaming..." },
        { turnId: "turn-1", sequence: 0, source: "agent", timestamp: 1000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Final answer." },
        { turnId: "turn-1", sequence: 1, source: "agent", timestamp: 2000 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    expect(result[0]?.status).toBe("complete");
  });

  it("maps tool.call_start to tool_call agent event", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc-1",
          toolName: "search_hybrid",
          displayName: "Hybrid Search",
          toolInput: { query: "test" },
        },
        {
          turnId: "turn-1",
          sequence: 0,
          source: "tool",
          timestamp: 1000,
          toolCallId: "tc-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const toolCallMsg = result[0];
    expect(toolCallMsg?.role).toBe("assistant");
    expect(toolCallMsg?.events.length).toBe(1);
    const event = toolCallMsg?.events[0];
    expect(event?.type).toBe("tool_call");
    if (event?.type === "tool_call") {
      expect(event.toolCallId).toBe("tc-1");
      expect(event.toolName).toBe("search_hybrid");
      expect(event.displayName).toBe("Hybrid Search");
      expect(event.toolInput).toEqual({ query: "test" });
    }
  });

  it("maps tool.call_result to tool_result agent event", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc-1",
          toolName: "search_hybrid",
          toolOutput: { results: [1, 2, 3] },
          durationMs: 150,
          success: true,
        },
        {
          turnId: "turn-1",
          sequence: 0,
          source: "tool",
          timestamp: 1000,
          toolCallId: "tc-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const event = result[0]?.events[0];
    expect(event?.type).toBe("tool_result");
    if (event?.type === "tool_result") {
      expect(event.toolCallId).toBe("tc-1");
      expect(event.toolName).toBe("search_hybrid");
      expect(event.toolOutput).toEqual({ results: [1, 2, 3] });
      expect(event.durationMs).toBe(150);
      expect(event.success).toBe(true);
    }
  });

  it("maps chat.thinking to thinking agent event", () => {
    const events = [
      createEvent(
        { type: "chat.thinking", content: "Let me consider this..." },
        { turnId: "turn-1", sequence: 0, source: "agent", timestamp: 1000 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const event = result[0]?.events[0];
    expect(event?.type).toBe("thinking");
    if (event?.type === "thinking") {
      expect(event.message).toBe("Let me consider this...");
    }
  });

  it("maps execution.started to status agent event", () => {
    const events = [
      createEvent(
        { type: "execution.started", executionId: "exec-1", status: "RUNNING" },
        {
          turnId: "turn-1",
          sequence: 0,
          source: "system",
          timestamp: 1000,
          executionId: "exec-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const event = result[0]?.events[0];
    expect(event?.type).toBe("status");
    if (event?.type === "status") {
      expect(event.status).toBe("started");
      expect(event.message).toBe("Execution exec-1 started");
    }
  });

  it("maps execution.failed to error agent event", () => {
    const events = [
      createEvent(
        {
          type: "execution.failed",
          executionId: "exec-1",
          error: "Timeout exceeded",
          retryable: true,
        },
        {
          turnId: "turn-1",
          sequence: 0,
          source: "system",
          timestamp: 1000,
          executionId: "exec-1",
        }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    const event = result[0]?.events[0];
    expect(event?.type).toBe("error");
    if (event?.type === "error") {
      expect(event.code).toBe("EXECUTION_FAILED");
      expect(event.message).toBe("Timeout exceeded");
      expect(event.retryable).toBe(true);
    }
  });

  it("assigns synthetic turn ID for events without turnId", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "no turn id here" },
        { sequence: 0, source: "user", timestamp: 1000 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("__no_turn__-user");
  });

  it("preserves turn order from first event appearance", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "First question" },
        { turnId: "turn-1", sequence: 0, source: "user", timestamp: 1000 }
      ),
      createEvent(
        { type: "chat.user_message", content: "Second question" },
        { turnId: "turn-2", sequence: 1, source: "user", timestamp: 2000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Answer to first" },
        { turnId: "turn-1", sequence: 2, source: "agent", timestamp: 3000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Answer to second" },
        { turnId: "turn-2", sequence: 3, source: "agent", timestamp: 4000 }
      ),
    ];

    const result = projectRuntimeEventsToMessages(events);

    expect(result.length).toBe(4);
    expect(result[0]?.id).toBe("turn-1-user");
    expect(result[1]?.id).toBe("turn-1-assistant");
    expect(result[2]?.id).toBe("turn-2-user");
    expect(result[3]?.id).toBe("turn-2-assistant");
  });

  it("derives ChatStatus correctly: streaming when only deltas, complete when final, error when failed", () => {
    const streamingEvents = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "streaming..." },
        { turnId: "turn-stream", sequence: 0, source: "agent", timestamp: 1000 }
      ),
    ];
    const streamingResult = projectRuntimeEventsToMessages(streamingEvents);
    expect(streamingResult[0]?.status).toBe("streaming");

    const completeEvents = [
      createEvent(
        { type: "chat.assistant_final", content: "Done." },
        {
          turnId: "turn-complete",
          sequence: 0,
          source: "agent",
          timestamp: 1000,
        }
      ),
    ];
    const completeResult = projectRuntimeEventsToMessages(completeEvents);
    expect(completeResult[0]?.status).toBe("complete");

    const errorEvents = [
      createEvent(
        {
          type: "execution.failed",
          executionId: "exec-1",
          error: "Crashed",
          retryable: false,
        },
        { turnId: "turn-error", sequence: 0, source: "system", timestamp: 1000 }
      ),
    ];
    const errorResult = projectRuntimeEventsToMessages(errorEvents);
    expect(errorResult[0]?.status).toBe("error");
  });
});
