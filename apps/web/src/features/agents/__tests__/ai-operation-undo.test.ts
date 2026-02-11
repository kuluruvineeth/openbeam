import { beforeEach, describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";

let seq = 0;

function createTestEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  seq += 1;
  return {
    eventId: crypto.randomUUID(),
    sequence: seq,
    timestamp: Date.now(),
    canvasId: "canvas_1",
    sessionId: "session_1",
    source: "agent",
    visibility: "visible",
    payload,
    ...overrides,
  };
}

function chatUserMessage(content = "hello", turnId = "turn_1"): RuntimeEvent {
  return createTestEvent({ type: "chat.user_message", content }, { turnId });
}

function chatAssistantFinal(content = "reply"): RuntimeEvent {
  return createTestEvent({
    type: "chat.assistant_final",
    content,
  });
}

function executionStarted(executionId = "exec_1"): RuntimeEvent {
  return createTestEvent({
    type: "execution.started",
    executionId,
    status: "RUNNING",
  });
}

function executionCompleted(executionId = "exec_1"): RuntimeEvent {
  return createTestEvent({
    type: "execution.completed",
    executionId,
    status: "COMPLETED",
  });
}

function executionFailed(executionId = "exec_1"): RuntimeEvent {
  return createTestEvent({
    type: "execution.failed",
    executionId,
    error: "something went wrong",
  });
}

function executionProgress(
  executionId = "exec_1",
  nodeId = "node_1"
): RuntimeEvent {
  return createTestEvent({
    type: "execution.progress",
    executionId,
    nodeId,
  });
}

describe("AgenticRuntimeStore", () => {
  beforeEach(() => {
    seq = 0;
    useAgenticRuntimeStore.getState().resetSessionState();
    useAgenticRuntimeStore.getState().setSessionId("session_1");
  });

  describe("initialization", () => {
    beforeEach(() => {
      useAgenticRuntimeStore.getState().resetSessionState();
    });

    it("starts with empty events", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.events).toEqual([]);
    });

    it("starts with null sessionId", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.sessionId).toBeNull();
    });

    it("starts with null activeTurnId", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.activeTurnId).toBeNull();
    });

    it("starts with null activeExecutionId", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.activeExecutionId).toBeNull();
    });

    it("starts with lastSequence at 0", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.lastSequence).toBe(0);
    });

    it("starts with idle connectionStatus", () => {
      const state = useAgenticRuntimeStore.getState();
      expect(state.connectionStatus).toBe("idle");
    });
  });

  describe("applyEvent", () => {
    it("adds event to events array", () => {
      const event = chatUserMessage();
      useAgenticRuntimeStore.getState().applyEvent(event);

      const state = useAgenticRuntimeStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0]).toBe(event);
    });

    it("tracks eventId in eventIdSet", () => {
      const event = chatUserMessage();
      useAgenticRuntimeStore.getState().applyEvent(event);

      const state = useAgenticRuntimeStore.getState();
      expect(state.eventIdSet[event.eventId]).toBe(true);
    });

    it("updates lastSequence", () => {
      const event = createTestEvent(
        { type: "chat.user_message", content: "test" },
        { sequence: 42 }
      );
      useAgenticRuntimeStore.getState().applyEvent(event);

      expect(useAgenticRuntimeStore.getState().lastSequence).toBe(42);
    });

    it("keeps higher lastSequence when applying lower sequence event", () => {
      const high = createTestEvent(
        { type: "chat.user_message", content: "first" },
        { sequence: 100 }
      );
      const low = createTestEvent(
        { type: "chat.assistant_final", content: "second" },
        { sequence: 5 }
      );

      const { applyEvent } = useAgenticRuntimeStore.getState();
      applyEvent(high);
      applyEvent(low);

      expect(useAgenticRuntimeStore.getState().lastSequence).toBe(100);
    });
  });

  describe("deduplication", () => {
    it("ignores duplicate eventId on applyEvent", () => {
      const event = chatUserMessage();
      const { applyEvent } = useAgenticRuntimeStore.getState();

      applyEvent(event);
      applyEvent(event);

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(1);
    });

    it("ignores duplicate eventId on applyEvents", () => {
      const event = chatUserMessage();
      useAgenticRuntimeStore.getState().applyEvents([event, event]);

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(1);
    });

    it("ignores events already present when using applyEvents", () => {
      const event = chatUserMessage();
      useAgenticRuntimeStore.getState().applyEvent(event);

      const newEvent = chatAssistantFinal();
      useAgenticRuntimeStore.getState().applyEvents([event, newEvent]);

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(2);
    });
  });

  describe("applyEvents batch", () => {
    it("adds multiple events in one call", () => {
      const events = [chatUserMessage(), chatAssistantFinal()];
      useAgenticRuntimeStore.getState().applyEvents(events);

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(2);
    });

    it("tracks highest sequence across batch", () => {
      const a = createTestEvent(
        { type: "chat.user_message", content: "a" },
        { sequence: 3 }
      );
      const b = createTestEvent(
        { type: "chat.assistant_final", content: "b" },
        { sequence: 7 }
      );

      useAgenticRuntimeStore.getState().applyEvents([a, b]);
      expect(useAgenticRuntimeStore.getState().lastSequence).toBe(7);
    });

    it("skips entirely when all events are duplicates", () => {
      const event = chatUserMessage();
      useAgenticRuntimeStore.getState().applyEvent(event);

      const before = useAgenticRuntimeStore.getState().events;
      useAgenticRuntimeStore.getState().applyEvents([event]);
      const after = useAgenticRuntimeStore.getState().events;

      expect(before).toBe(after);
    });
  });

  describe("state derivation — execution.started", () => {
    it("sets activeExecutionId", () => {
      useAgenticRuntimeStore.getState().applyEvent(executionStarted("exec_42"));

      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe(
        "exec_42"
      );
    });
  });

  describe("state derivation — execution.completed", () => {
    it("clears activeExecutionId", () => {
      const { applyEvent } = useAgenticRuntimeStore.getState();
      applyEvent(executionStarted("exec_1"));
      applyEvent(executionCompleted("exec_1"));

      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
    });
  });

  describe("state derivation — execution.failed", () => {
    it("clears activeExecutionId", () => {
      const { applyEvent } = useAgenticRuntimeStore.getState();
      applyEvent(executionStarted("exec_1"));
      applyEvent(executionFailed("exec_1"));

      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
    });
  });

  describe("state derivation — execution.progress", () => {
    it("tracks node status by execution", () => {
      useAgenticRuntimeStore
        .getState()
        .applyEvent(executionProgress("exec_1", "node_a"));

      const nodeStatus =
        useAgenticRuntimeStore.getState().nodeStatusByExecutionId;
      expect(nodeStatus.exec_1?.node_a).toBe("running");
    });

    it("accumulates multiple node statuses via batch apply", () => {
      useAgenticRuntimeStore
        .getState()
        .applyEvents([
          executionProgress("exec_1", "node_a"),
          executionProgress("exec_1", "node_b"),
        ]);

      const nodeStatus =
        useAgenticRuntimeStore.getState().nodeStatusByExecutionId;
      expect(nodeStatus.exec_1?.node_a).toBe("running");
      expect(nodeStatus.exec_1?.node_b).toBe("running");
    });
  });

  describe("state derivation — chat.user_message", () => {
    it("sets activeTurnId from turnId", () => {
      useAgenticRuntimeStore
        .getState()
        .applyEvent(chatUserMessage("hi", "turn_99"));

      expect(useAgenticRuntimeStore.getState().activeTurnId).toBe("turn_99");
    });

    it("retains existing activeTurnId when turnId is missing via batch", () => {
      useAgenticRuntimeStore
        .getState()
        .applyEvents([
          chatUserMessage("first", "turn_1"),
          createTestEvent(
            { type: "chat.user_message", content: "second" },
            { turnId: undefined }
          ),
        ]);

      expect(useAgenticRuntimeStore.getState().activeTurnId).toBe("turn_1");
    });
  });

  describe("state derivation — chat.assistant_final", () => {
    it("clears activeTurnId", () => {
      const { applyEvent } = useAgenticRuntimeStore.getState();
      applyEvent(chatUserMessage("hi", "turn_1"));
      applyEvent(chatAssistantFinal("bye"));

      expect(useAgenticRuntimeStore.getState().activeTurnId).toBeNull();
    });
  });

  describe("setSessionId", () => {
    it("updates sessionId", () => {
      useAgenticRuntimeStore.getState().setSessionId("ses_abc");
      expect(useAgenticRuntimeStore.getState().sessionId).toBe("ses_abc");
    });
  });

  describe("setConnectionStatus", () => {
    it("updates connectionStatus", () => {
      useAgenticRuntimeStore.getState().setConnectionStatus("connected");
      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe(
        "connected"
      );
    });
  });

  describe("resetSessionState", () => {
    it("resets all state to initial values", () => {
      const store = useAgenticRuntimeStore.getState();
      store.setSessionId("ses_1");
      store.setConnectionStatus("connected");
      store.applyEvent(chatUserMessage("hi", "turn_1"));
      store.applyEvent(executionStarted("exec_1"));

      useAgenticRuntimeStore.getState().resetSessionState();

      const reset = useAgenticRuntimeStore.getState();
      expect(reset.events).toEqual([]);
      expect(reset.sessionId).toBeNull();
      expect(reset.activeTurnId).toBeNull();
      expect(reset.activeExecutionId).toBeNull();
      expect(reset.lastSequence).toBe(0);
      expect(reset.connectionStatus).toBe("idle");
      expect(reset.eventIdSet).toEqual({});
      expect(reset.messageIdsByTurn).toEqual({});
      expect(reset.timelineByExecutionId).toEqual({});
      expect(reset.nodeStatusByExecutionId).toEqual({});
      expect(reset.edgeStateByExecutionId).toEqual({});
      expect(reset.waitingStateByExecutionId).toEqual({});
    });
  });

  describe("full lifecycle", () => {
    it("processes a complete turn: user message -> execution -> assistant reply", () => {
      const { applyEvents } = useAgenticRuntimeStore.getState();

      const events: RuntimeEvent[] = [
        chatUserMessage("build a workflow", "turn_1"),
        executionStarted("exec_1"),
        executionProgress("exec_1", "node_entry"),
        executionCompleted("exec_1"),
        chatAssistantFinal("done"),
      ];

      applyEvents(events);

      const state = useAgenticRuntimeStore.getState();
      expect(state.events).toHaveLength(5);
      expect(state.activeTurnId).toBeNull();
      expect(state.activeExecutionId).toBeNull();
      expect(state.lastSequence).toBe(5);
      expect(state.nodeStatusByExecutionId.exec_1?.node_entry).toBe("running");
    });
  });
});
