import { beforeEach, describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";

function createMockEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: crypto.randomUUID(),
    sequence: 1,
    timestamp: Date.now(),
    canvasId: "canvas_1",
    sessionId: "session_1",
    source: "system",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

function filterCommands(
  commands: Array<{ id: string; label: string }>,
  query: string
) {
  if (!query) {
    return commands;
  }
  const lowerQuery = query.toLowerCase();
  return commands.filter((cmd) => cmd.label.toLowerCase().includes(lowerQuery));
}

describe("Runtime Store + Stream Integration", () => {
  beforeEach(() => {
    useAgenticRuntimeStore.getState().resetSessionState();
    useAgenticRuntimeStore.getState().setSessionId("session_1");
  });

  it("applies single event from stream", () => {
    const event = createMockEvent(
      { type: "chat.user_message", content: "hello" },
      { sequence: 5 }
    );

    useAgenticRuntimeStore.getState().applyEvent(event);

    const state = useAgenticRuntimeStore.getState();
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toBe(event);
    expect(state.lastSequence).toBe(5);
  });

  it("deduplicates repeated events", () => {
    const event = createMockEvent(
      { type: "chat.user_message", content: "hello" },
      { eventId: "fixed-id-1" }
    );

    useAgenticRuntimeStore.getState().applyEvent(event);
    useAgenticRuntimeStore.getState().applyEvent(event);

    const state = useAgenticRuntimeStore.getState();
    expect(state.events).toHaveLength(1);
  });

  it("updates connection status", () => {
    useAgenticRuntimeStore.getState().setConnectionStatus("connected");

    expect(useAgenticRuntimeStore.getState().connectionStatus).toBe(
      "connected"
    );
  });

  it("tracks active execution from execution.started", () => {
    const event = createMockEvent({
      type: "execution.started",
      executionId: "exec_42",
      status: "RUNNING",
    });

    useAgenticRuntimeStore.getState().applyEvent(event);

    expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe("exec_42");
  });

  it("clears active execution on execution.completed", () => {
    const startEvent = createMockEvent(
      {
        type: "execution.started",
        executionId: "exec_42",
        status: "RUNNING",
      },
      { sequence: 1 }
    );
    const completeEvent = createMockEvent(
      {
        type: "execution.completed",
        executionId: "exec_42",
        status: "COMPLETED",
        durationMs: 1200,
      },
      { sequence: 2 }
    );

    useAgenticRuntimeStore.getState().applyEvent(startEvent);
    expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe("exec_42");

    useAgenticRuntimeStore.getState().applyEvent(completeEvent);
    expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
  });

  it("resets on resetSessionState", () => {
    const event = createMockEvent(
      { type: "chat.user_message", content: "hello" },
      { sequence: 10 }
    );

    useAgenticRuntimeStore.getState().applyEvent(event);
    useAgenticRuntimeStore.getState().setConnectionStatus("connected");
    useAgenticRuntimeStore.getState().setSessionId("session_x");

    useAgenticRuntimeStore.getState().resetSessionState();

    const state = useAgenticRuntimeStore.getState();
    expect(state.events).toHaveLength(0);
    expect(state.lastSequence).toBe(0);
    expect(state.connectionStatus).toBe("idle");
    expect(state.sessionId).toBeNull();
    expect(state.activeExecutionId).toBeNull();
  });
});

describe("Session State Management", () => {
  beforeEach(() => {
    useAgenticRuntimeStore.getState().resetSessionState();
  });

  it("initializes with null session", () => {
    expect(useAgenticRuntimeStore.getState().sessionId).toBeNull();
  });

  it("sets session id", () => {
    useAgenticRuntimeStore.getState().setSessionId("session_1");

    expect(useAgenticRuntimeStore.getState().sessionId).toBe("session_1");
  });

  it("reset clears session id", () => {
    useAgenticRuntimeStore.getState().setSessionId("session_1");
    useAgenticRuntimeStore.getState().resetSessionState();

    expect(useAgenticRuntimeStore.getState().sessionId).toBeNull();
  });
});

describe("Command Palette Filter Logic", () => {
  const commands = [
    { id: "search", label: "Search Documents" },
    { id: "create", label: "Create Node" },
    { id: "delete", label: "Delete Selection" },
    { id: "export", label: "Export Canvas" },
  ];

  it("returns all commands for empty query", () => {
    const result = filterCommands(commands, "");
    expect(result).toHaveLength(4);
    expect(result).toEqual(commands);
  });

  it("filters by label case-insensitive", () => {
    const result = filterCommands(commands, "SEARCH");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("search");
  });

  it("returns empty array when no matches", () => {
    const result = filterCommands(commands, "zzzzzzz");
    expect(result).toHaveLength(0);
  });

  it("handles partial matches", () => {
    const result = filterCommands(commands, "de");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(["create", "delete"]);
  });
});
