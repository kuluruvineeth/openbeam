import { beforeEach, describe, expect, it } from "bun:test";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";

let seq = 0;

function createEvent(
  payload: RuntimeEvent["payload"],
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  seq += 1;
  return {
    eventId: `evt_${seq}`,
    sequence: seq,
    timestamp: Date.now(),
    canvasId: "canvas_int",
    sessionId: "session_int",
    source: "agent",
    visibility: "visible",
    payload,
    ...overrides,
  } as RuntimeEvent;
}

describe("agentic runtime integration", () => {
  beforeEach(() => {
    seq = 0;
    useAgenticRuntimeStore.getState().resetSessionState();
    useAgenticRuntimeStore.getState().setSessionId("session_int");
  });

  describe("full conversation lifecycle", () => {
    it("transitions state through user message, execution, and assistant reply", () => {
      const { applyEvent } = useAgenticRuntimeStore.getState();

      const userMsg = createEvent(
        { type: "chat.user_message", content: "build it" },
        { turnId: "turn_1" }
      );
      applyEvent(userMsg);
      expect(useAgenticRuntimeStore.getState().activeTurnId).toBe("turn_1");
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();

      const execStarted = createEvent({
        type: "execution.started",
        executionId: "exec_1",
        status: "RUNNING",
      });
      applyEvent(execStarted);
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe(
        "exec_1"
      );
      expect(useAgenticRuntimeStore.getState().activeTurnId).toBe("turn_1");

      const progress = createEvent({
        type: "execution.progress",
        executionId: "exec_1",
        nodeId: "node_entry",
      });
      applyEvent(progress);
      const nodeStatus =
        useAgenticRuntimeStore.getState().nodeStatusByExecutionId;
      expect(nodeStatus.exec_1?.node_entry).toBe("running");

      const execCompleted = createEvent({
        type: "execution.completed",
        executionId: "exec_1",
        status: "COMPLETED",
      });
      applyEvent(execCompleted);
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
      expect(useAgenticRuntimeStore.getState().activeTurnId).toBe("turn_1");

      const assistantFinal = createEvent({
        type: "chat.assistant_final",
        content: "done building",
      });
      applyEvent(assistantFinal);
      expect(useAgenticRuntimeStore.getState().activeTurnId).toBeNull();
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
      expect(useAgenticRuntimeStore.getState().events).toHaveLength(5);
    });
  });

  describe("multiple concurrent executions", () => {
    it("tracks the latest execution and clears on completion", () => {
      const { applyEvent } = useAgenticRuntimeStore.getState();

      applyEvent(
        createEvent({
          type: "execution.started",
          executionId: "exec_1",
          status: "RUNNING",
        })
      );
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe(
        "exec_1"
      );

      applyEvent(
        createEvent({
          type: "execution.started",
          executionId: "exec_2",
          status: "RUNNING",
        })
      );
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBe(
        "exec_2"
      );

      applyEvent(
        createEvent({
          type: "execution.completed",
          executionId: "exec_1",
          status: "COMPLETED",
        })
      );
      expect(useAgenticRuntimeStore.getState().activeExecutionId).toBeNull();
    });
  });

  describe("batch event application maintains order", () => {
    it("preserves sequence and tracks all 20 events", () => {
      const events: RuntimeEvent[] = Array.from({ length: 20 }, (_, i) =>
        createEvent(
          { type: "chat.assistant_delta", chunk: `chunk_${i}` },
          { sequence: i + 1 }
        )
      );

      useAgenticRuntimeStore.getState().applyEvents(events);

      const state = useAgenticRuntimeStore.getState();
      expect(state.events).toHaveLength(20);
      expect(state.lastSequence).toBe(20);

      for (const event of events) {
        expect(state.eventIdSet[event.eventId]).toBe(true);
      }
    });
  });

  describe("session reset clears all state", () => {
    it("restores every field to its initial value", () => {
      const store = useAgenticRuntimeStore.getState();

      store.setSessionId("ses_full");
      store.setConnectionStatus("connected");
      store.applyEvent(
        createEvent(
          { type: "chat.user_message", content: "hi" },
          { turnId: "turn_1" }
        )
      );
      store.applyEvent(
        createEvent({
          type: "execution.started",
          executionId: "exec_1",
          status: "RUNNING",
        })
      );
      store.applyEvent(
        createEvent({
          type: "execution.progress",
          executionId: "exec_1",
          nodeId: "node_x",
        })
      );

      useAgenticRuntimeStore.getState().resetSessionState();

      const reset = useAgenticRuntimeStore.getState();
      expect(reset.sessionId).toBeNull();
      expect(reset.activeTurnId).toBeNull();
      expect(reset.activeExecutionId).toBeNull();
      expect(reset.connectionStatus).toBe("idle");
      expect(reset.events).toEqual([]);
      expect(reset.eventIdSet).toEqual({});
      expect(reset.lastSequence).toBe(0);
      expect(reset.messageIdsByTurn).toEqual({});
      expect(reset.timelineByExecutionId).toEqual({});
      expect(reset.nodeStatusByExecutionId).toEqual({});
      expect(reset.edgeStateByExecutionId).toEqual({});
      expect(reset.waitingStateByExecutionId).toEqual({});
    });
  });

  describe("event deduplication across apply methods", () => {
    it("stores event exactly once when applied via applyEvent then applyEvents", () => {
      const event = createEvent({
        type: "chat.user_message",
        content: "dedupe me",
      });

      useAgenticRuntimeStore.getState().applyEvent(event);

      const secondEvent = createEvent({
        type: "chat.assistant_final",
        content: "reply",
      });
      useAgenticRuntimeStore.getState().applyEvents([event, secondEvent]);

      const state = useAgenticRuntimeStore.getState();
      expect(state.events).toHaveLength(2);

      const matchingEvents = state.events.filter(
        (e) => e.eventId === event.eventId
      );
      expect(matchingEvents).toHaveLength(1);
    });
  });

  describe("completed streaming turn blocks server duplicates", () => {
    it("blocks non-local events for a turn after clearActiveTurn", () => {
      const store = useAgenticRuntimeStore.getState();
      const turnId = "turn_stream";

      store.setStreamingTurnId(turnId);

      store.applyEvent(
        createEvent(
          { type: "chat.user_message", content: "build it" },
          { turnId }
        ),
        { local: true }
      );

      store.applyEvent(
        createEvent(
          { type: "chat.assistant_final", content: "done" },
          { turnId }
        ),
        { local: true }
      );

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(2);

      store.clearActiveTurn();

      expect(
        useAgenticRuntimeStore.getState().completedStreamingTurnIds[turnId]
      ).toBe(true);

      store.applyEvent(
        createEvent(
          { type: "chat.assistant_final", content: "done" },
          { turnId }
        )
      );

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(2);
    });

    it("allows events for different turns after clearActiveTurn", () => {
      const store = useAgenticRuntimeStore.getState();

      store.setStreamingTurnId("turn_a");
      store.applyEvent(
        createEvent(
          { type: "chat.user_message", content: "msg a" },
          { turnId: "turn_a" }
        ),
        { local: true }
      );
      store.clearActiveTurn();

      store.applyEvent(
        createEvent(
          { type: "chat.user_message", content: "msg b" },
          { turnId: "turn_b" }
        )
      );

      expect(useAgenticRuntimeStore.getState().events).toHaveLength(2);
    });

    it("resetSessionState clears completedStreamingTurnIds", () => {
      const store = useAgenticRuntimeStore.getState();
      store.setStreamingTurnId("turn_reset");
      store.clearActiveTurn();

      expect(
        useAgenticRuntimeStore.getState().completedStreamingTurnIds.turn_reset
      ).toBe(true);

      store.resetSessionState();

      expect(
        useAgenticRuntimeStore.getState().completedStreamingTurnIds
      ).toEqual({});
    });
  });

  describe("connection status lifecycle", () => {
    it("transitions through connecting, connected, error, and idle", () => {
      const store = useAgenticRuntimeStore.getState();

      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe("idle");

      store.setConnectionStatus("connecting");
      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe(
        "connecting"
      );

      store.setConnectionStatus("connected");
      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe(
        "connected"
      );

      store.setConnectionStatus("error");
      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe("error");

      store.setConnectionStatus("idle");
      expect(useAgenticRuntimeStore.getState().connectionStatus).toBe("idle");
    });
  });

  describe("mixed event types don't interfere", () => {
    it("only chat and execution events affect activeTurnId and activeExecutionId", () => {
      const { applyEvents } = useAgenticRuntimeStore.getState();

      const events: RuntimeEvent[] = [
        createEvent(
          { type: "chat.user_message", content: "start" },
          { turnId: "turn_mix" }
        ),
        createEvent({
          type: "tool.call_start",
          toolCallId: "tc_1",
          toolName: "search",
        }),
        createEvent({
          type: "tool.call_result",
          toolCallId: "tc_1",
          toolName: "search",
          success: true,
        }),
        createEvent({
          type: "canvas.op_applied",
          operation: { type: "addNode", nodeId: "n1", data: {} } as never,
        }),
        createEvent({ type: "chat.assistant_delta", chunk: "working..." }),
        createEvent({
          type: "execution.started",
          executionId: "exec_mix",
          status: "RUNNING",
        }),
      ];

      applyEvents(events);

      const state = useAgenticRuntimeStore.getState();
      expect(state.activeTurnId).toBe("turn_mix");
      expect(state.activeExecutionId).toBe("exec_mix");
      expect(state.events).toHaveLength(6);

      useAgenticRuntimeStore.getState().applyEvents([
        createEvent({
          type: "session.started",
          sessionId: "ses_new",
        }),
        createEvent({
          type: "chat.thinking",
          content: "reasoning...",
        }),
      ]);

      const afterMixed = useAgenticRuntimeStore.getState();
      expect(afterMixed.activeTurnId).toBe("turn_mix");
      expect(afterMixed.activeExecutionId).toBe("exec_mix");
      expect(afterMixed.events).toHaveLength(8);
    });
  });
});
