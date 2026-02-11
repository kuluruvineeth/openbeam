import { describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import { projectRuntimeEventsToMessages } from "../runtime-message-projection";

function createEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: `evt_${Math.random().toString(36).slice(2, 9)}`,
    sequence: 0,
    timestamp: Date.now(),
    canvasId: "canvas_1",
    sessionId: "session_1",
    source: "agent",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

describe("projectRuntimeEventsToMessages", () => {
  it("returns empty array for empty events", () => {
    expect(projectRuntimeEventsToMessages([])).toEqual([]);
  });

  it("creates user message from chat.user_message", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "Hello" },
        { turnId: "turn_1", source: "user" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].id).toBe("turn_1-user");
    expect(messages[0].events).toHaveLength(1);
    expect(messages[0].events[0].type).toBe("text");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].status).toBe("streaming");
    expect(messages[1].events).toHaveLength(1);
    expect(messages[1].events[0].type).toBe("text");
    expect((messages[1].events[0] as { isPartial?: boolean }).isPartial).toBe(
      true
    );
  });

  it("creates assistant message from chat.assistant_delta", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "Hi there" },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].status).toBe("streaming");
  });

  it("appends multiple deltas into one partial text event", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "Hello " },
        { turnId: "turn_1", sequence: 1 }
      ),
      createEvent(
        { type: "chat.assistant_delta", chunk: "world" },
        { turnId: "turn_1", sequence: 2 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].events).toHaveLength(1);
    expect(messages[0].events[0].type).toBe("text");
    if (messages[0].events[0].type === "text") {
      expect(messages[0].events[0].content).toBe("Hello world");
      expect(messages[0].events[0].isPartial).toBe(true);
    }
  });

  it("groups user + assistant events into same turn", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "What is AI?" },
        { turnId: "turn_1", source: "user", sequence: 1, timestamp: 1000 }
      ),
      createEvent(
        { type: "chat.assistant_delta", chunk: "AI is " },
        { turnId: "turn_1", sequence: 2, timestamp: 2000 }
      ),
      createEvent(
        {
          type: "chat.assistant_final",
          content: "AI is artificial intelligence.",
        },
        { turnId: "turn_1", sequence: 3, timestamp: 3000 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].id).toBe("turn_1-user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].id).toBe("turn_1-assistant");
    expect(messages[1].status).toBe("complete");
  });

  it("sets status to complete when assistant_final arrives", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "Hi" },
        { turnId: "turn_1", sequence: 1 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Hi there!" },
        { turnId: "turn_1", sequence: 2 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages[0].status).toBe("complete");
  });

  it("sets status to error when execution.failed arrives", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "working..." },
        { turnId: "turn_1", sequence: 1 }
      ),
      createEvent(
        {
          type: "execution.failed",
          executionId: "exec_1",
          error: "timeout",
        },
        { turnId: "turn_1", sequence: 2 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].status).toBe("error");
  });

  it("sets status to streaming when only deltas exist", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "thinking..." },
        { turnId: "turn_1", sequence: 1 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages[0].status).toBe("streaming");
  });

  it("maps tool.call_start to tool_call agent event", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_1",
          toolName: "search_hybrid",
          displayName: "Search",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    const toolEvent = messages[0].events[0];
    expect(toolEvent.type).toBe("tool_call");
    if (toolEvent.type === "tool_call") {
      expect(toolEvent.toolCallId).toBe("tc_1");
      expect(toolEvent.toolName).toBe("search_hybrid");
      expect(toolEvent.displayName).toBe("Search");
      expect(toolEvent.visibility).toBe("visible");
    }
  });

  it("maps tool.call_result to tool_result agent event", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_1",
          toolName: "search_hybrid",
          success: true,
          durationMs: 150,
          toolOutput: { results: [] },
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const toolResult = messages[0].events[0];
    expect(toolResult.type).toBe("tool_result");
    if (toolResult.type === "tool_result") {
      expect(toolResult.success).toBe(true);
      expect(toolResult.durationMs).toBe(150);
    }
  });

  it("maps chat.thinking to thinking agent event", () => {
    const events = [
      createEvent(
        { type: "chat.thinking", content: "Let me analyze..." },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const thinkingEvent = messages[0].events[0];
    expect(thinkingEvent.type).toBe("thinking");
    if (thinkingEvent.type === "thinking") {
      expect(thinkingEvent.message).toBe("Let me analyze...");
    }
  });

  it("maps execution.started to status agent event", () => {
    const events = [
      createEvent(
        {
          type: "execution.started",
          executionId: "exec_1",
          status: "RUNNING",
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const statusEvent = messages[0].events[0];
    expect(statusEvent.type).toBe("status");
  });

  it("maps execution.completed to done agent event", () => {
    const events = [
      createEvent(
        {
          type: "execution.completed",
          executionId: "exec_1",
          status: "COMPLETED",
          durationMs: 5000,
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const doneEvent = messages[0].events[0];
    expect(doneEvent.type).toBe("done");
    if (doneEvent.type === "done") {
      expect(doneEvent.success).toBe(true);
    }
  });

  it("maps execution.failed to error agent event", () => {
    const events = [
      createEvent(
        {
          type: "execution.failed",
          executionId: "exec_1",
          error: "Node execution timeout",
          retryable: true,
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const errorEvent = messages[0].events[0];
    expect(errorEvent.type).toBe("error");
    if (errorEvent.type === "error") {
      expect(errorEvent.message).toBe("Node execution timeout");
      expect(errorEvent.retryable).toBe(true);
    }
  });

  it("skips canvas.op_applied events", () => {
    const events = [
      createEvent(
        {
          type: "canvas.op_applied",
          operation: {
            type: "add_node",
            id: "n1",
            nodeType: "llm",
            timestamp: Date.now(),
          },
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(0);
  });

  it("skips session.started events", () => {
    const events = [
      createEvent(
        { type: "session.started", sessionId: "s1" },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(0);
  });

  it("handles multiple turns in order", () => {
    const events = [
      createEvent(
        { type: "chat.user_message", content: "First question" },
        { turnId: "turn_1", source: "user", sequence: 1, timestamp: 1000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "First answer" },
        { turnId: "turn_1", sequence: 2, timestamp: 2000 }
      ),
      createEvent(
        { type: "chat.user_message", content: "Second question" },
        { turnId: "turn_2", source: "user", sequence: 3, timestamp: 3000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Second answer" },
        { turnId: "turn_2", sequence: 4, timestamp: 4000 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(4);
    expect(messages[0].id).toBe("turn_1-user");
    expect(messages[1].id).toBe("turn_1-assistant");
    expect(messages[2].id).toBe("turn_2-user");
    expect(messages[3].id).toBe("turn_2-assistant");
  });

  it("handles events without turnId using synthetic turn", () => {
    const events = [
      createEvent(
        { type: "chat.assistant_delta", chunk: "orphan event" },
        { sequence: 1 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("__no_turn__-assistant");
  });

  it("uses displayName fallback from toolName when absent", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_1",
          toolName: "search_hybrid",
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const toolEvent = messages[0].events[0];
    if (toolEvent.type === "tool_call") {
      expect(toolEvent.displayName).toBe("search_hybrid");
    }
  });

  it("preserves event order within a turn", () => {
    const events = [
      createEvent(
        { type: "chat.thinking", content: "Analyzing..." },
        { turnId: "turn_1", sequence: 1, timestamp: 1000 }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_1",
          toolName: "search",
        },
        { turnId: "turn_1", sequence: 2, timestamp: 2000 }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_1",
          toolName: "search",
          success: true,
        },
        { turnId: "turn_1", sequence: 3, timestamp: 3000 }
      ),
      createEvent(
        { type: "chat.assistant_final", content: "Here's what I found." },
        { turnId: "turn_1", sequence: 4, timestamp: 4000 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const assistant = messages[0];
    expect(assistant.events).toHaveLength(4);
    expect(assistant.events[0].type).toBe("thinking");
    expect(assistant.events[1].type).toBe("tool_call");
    expect(assistant.events[2].type).toBe("tool_result");
    expect(assistant.events[3].type).toBe("text");
  });

  it("skips events with hidden visibility", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_hidden",
          toolName: "canvas_add_node",
        },
        { turnId: "turn_1", visibility: "hidden" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(0);
  });

  it("emits status event for canvas tool.call_start", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_canvas",
          toolName: "canvas_add_node",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    const statusEvent = messages[0].events[0];
    expect(statusEvent.type).toBe("status");
    if (statusEvent.type === "status") {
      expect(statusEvent.status).toBe("canvas_tool");
      expect(statusEvent.message).toBe("Adding node");
    }
  });

  it("derives label for canvas_connect_nodes", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_connect",
          toolName: "canvas_connect_nodes",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const statusEvent = messages[0].events[0];
    if (statusEvent.type === "status") {
      expect(statusEvent.message).toBe("Connecting nodes");
    }
  });

  it("derives label for canvas_remove_node", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_remove",
          toolName: "canvas_remove_node",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const statusEvent = messages[0].events[0];
    if (statusEvent.type === "status") {
      expect(statusEvent.message).toBe("Removing node");
    }
  });

  it("derives label for unknown future canvas tool", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_future",
          toolName: "canvas_merge_workflows",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const statusEvent = messages[0].events[0];
    if (statusEvent.type === "status") {
      expect(statusEvent.message).toBe("Merging workflows");
    }
  });

  it("derives label for single-word canvas tool", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_validate",
          toolName: "canvas_validate",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const statusEvent = messages[0].events[0];
    if (statusEvent.type === "status") {
      expect(statusEvent.message).toBe("Validating");
    }
  });

  it("silently skips canvas tool.call_result", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_canvas",
          toolName: "canvas_add_node",
          success: true,
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(0);
  });

  it("still emits tool_call for non-canvas tools", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_search",
          toolName: "search_hybrid",
          displayName: "Search",
        },
        { turnId: "turn_1", visibility: "visible" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const toolEvent = messages[0].events[0];
    expect(toolEvent.type).toBe("tool_call");
  });

  it("still emits tool_result for non-canvas tools", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_search",
          toolName: "search_hybrid",
          success: true,
          durationMs: 200,
        },
        { turnId: "turn_1" }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    const resultEvent = messages[0].events[0];
    expect(resultEvent.type).toBe("tool_result");
  });

  it("mixes canvas status and non-canvas tool events in one turn", () => {
    const events = [
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_search",
          toolName: "search_hybrid",
        },
        { turnId: "turn_1", sequence: 1, timestamp: 1000 }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_search",
          toolName: "search_hybrid",
          success: true,
        },
        { turnId: "turn_1", sequence: 2, timestamp: 2000 }
      ),
      createEvent(
        {
          type: "tool.call_start",
          toolCallId: "tc_canvas",
          toolName: "canvas_add_node",
        },
        { turnId: "turn_1", sequence: 3, timestamp: 3000 }
      ),
      createEvent(
        {
          type: "tool.call_result",
          toolCallId: "tc_canvas",
          toolName: "canvas_add_node",
          success: true,
        },
        { turnId: "turn_1", sequence: 4, timestamp: 4000 }
      ),
    ];

    const messages = projectRuntimeEventsToMessages(events);
    expect(messages).toHaveLength(1);
    const assistant = messages[0];
    expect(assistant.events).toHaveLength(3);
    expect(assistant.events[0].type).toBe("tool_call");
    expect(assistant.events[1].type).toBe("tool_result");
    expect(assistant.events[2].type).toBe("status");
  });
});
