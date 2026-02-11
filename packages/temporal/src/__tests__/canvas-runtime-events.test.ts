import {
  CanvasOpAppliedPayloadSchema,
  CanvasOpRejectedPayloadSchema,
  ExecutionCompletedPayloadSchema,
  ExecutionFailedPayloadSchema,
  ExecutionProgressPayloadSchema,
  ExecutionStartedPayloadSchema,
  RUNTIME_EVENT_TYPES,
  RuntimeEventPayloadSchema,
  RuntimeEventSchema,
  SessionResumedPayloadSchema,
  SessionStartedPayloadSchema,
} from "@openplane/types/canvas/runtime-events";
import { describe, expect, it } from "vitest";

describe("RuntimeEvent Schema Validation", () => {
  const validBaseEvent = {
    eventId: "evt_001",
    sequence: 0,
    timestamp: Date.now(),
    canvasId: "canvas_1",
    sessionId: "session_1",
    source: "system" as const,
    visibility: "visible" as const,
    payload: {
      type: "execution.started" as const,
      executionId: "exec_1",
      status: "RUNNING" as const,
    },
  };

  it("parses a valid RuntimeEvent", () => {
    const result = RuntimeEventSchema.parse(validBaseEvent);
    expect(result.eventId).toBe("evt_001");
    expect(result.sequence).toBe(0);
    expect(result.canvasId).toBe("canvas_1");
    expect(result.source).toBe("system");
    expect(result.visibility).toBe("visible");
  });

  it("accepts optional fields", () => {
    const eventWithOptionals = {
      ...validBaseEvent,
      workspaceId: "ws_1",
      turnId: "turn_1",
      executionId: "exec_1",
      stepId: "step_1",
      toolCallId: "tc_1",
    };

    const result = RuntimeEventSchema.parse(eventWithOptionals);
    expect(result.workspaceId).toBe("ws_1");
    expect(result.turnId).toBe("turn_1");
    expect(result.executionId).toBe("exec_1");
    expect(result.stepId).toBe("step_1");
    expect(result.toolCallId).toBe("tc_1");
  });

  it("rejects negative sequence", () => {
    expect(() =>
      RuntimeEventSchema.parse({ ...validBaseEvent, sequence: -1 })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    const { canvasId: _, ...incomplete } = validBaseEvent;
    expect(() => RuntimeEventSchema.parse(incomplete)).toThrow();
  });

  it("rejects invalid source", () => {
    expect(() =>
      RuntimeEventSchema.parse({ ...validBaseEvent, source: "unknown" })
    ).toThrow();
  });

  it("rejects invalid visibility", () => {
    expect(() =>
      RuntimeEventSchema.parse({ ...validBaseEvent, visibility: "private" })
    ).toThrow();
  });

  it("accepts all valid source values", () => {
    for (const source of ["user", "agent", "system", "tool"] as const) {
      const result = RuntimeEventSchema.parse({
        ...validBaseEvent,
        source,
      });
      expect(result.source).toBe(source);
    }
  });

  it("accepts all valid visibility values", () => {
    for (const visibility of ["visible", "ephemeral", "hidden"] as const) {
      const result = RuntimeEventSchema.parse({
        ...validBaseEvent,
        visibility,
      });
      expect(result.visibility).toBe(visibility);
    }
  });
});

describe("RUNTIME_EVENT_TYPES", () => {
  const expectedTypes = [
    "chat.user_message",
    "chat.assistant_delta",
    "chat.assistant_final",
    "chat.thinking",
    "tool.call_start",
    "tool.call_result",
    "canvas.op_applied",
    "canvas.op_rejected",
    "canvas.snapshot",
    "execution.started",
    "execution.progress",
    "execution.completed",
    "execution.failed",
    "session.started",
    "session.resumed",
  ];

  it("contains all expected event types", () => {
    for (const eventType of expectedTypes) {
      expect(RUNTIME_EVENT_TYPES).toContain(eventType);
    }
  });

  it("has exactly the expected number of types", () => {
    expect(RUNTIME_EVENT_TYPES).toHaveLength(expectedTypes.length);
  });

  it("covers every category", () => {
    const categories = new Set(RUNTIME_EVENT_TYPES.map((t) => t.split(".")[0]));
    expect(categories).toEqual(
      new Set(["chat", "tool", "canvas", "execution", "session"])
    );
  });
});

describe("Execution Event Payloads", () => {
  describe("ExecutionStartedPayloadSchema", () => {
    it("parses valid payload", () => {
      const result = ExecutionStartedPayloadSchema.parse({
        type: "execution.started",
        executionId: "exec_1",
        status: "RUNNING",
      });
      expect(result.type).toBe("execution.started");
      expect(result.executionId).toBe("exec_1");
      expect(result.status).toBe("RUNNING");
    });

    it("accepts all valid statuses", () => {
      const statuses = [
        "PENDING",
        "RUNNING",
        "WAITING_APPROVAL",
        "WAITING_INPUT",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "TIMED_OUT",
      ] as const;

      for (const status of statuses) {
        const result = ExecutionStartedPayloadSchema.parse({
          type: "execution.started",
          executionId: "exec_1",
          status,
        });
        expect(result.status).toBe(status);
      }
    });

    it("rejects missing executionId", () => {
      expect(() =>
        ExecutionStartedPayloadSchema.parse({
          type: "execution.started",
          status: "RUNNING",
        })
      ).toThrow();
    });

    it("rejects invalid status", () => {
      expect(() =>
        ExecutionStartedPayloadSchema.parse({
          type: "execution.started",
          executionId: "exec_1",
          status: "UNKNOWN",
        })
      ).toThrow();
    });
  });

  describe("ExecutionCompletedPayloadSchema", () => {
    it("parses valid payload", () => {
      const result = ExecutionCompletedPayloadSchema.parse({
        type: "execution.completed",
        executionId: "exec_1",
        status: "COMPLETED",
      });
      expect(result.type).toBe("execution.completed");
      expect(result.status).toBe("COMPLETED");
    });

    it("accepts optional durationMs", () => {
      const result = ExecutionCompletedPayloadSchema.parse({
        type: "execution.completed",
        executionId: "exec_1",
        status: "COMPLETED",
        durationMs: 1500,
      });
      expect(result.durationMs).toBe(1500);
    });

    it("omits durationMs when not provided", () => {
      const result = ExecutionCompletedPayloadSchema.parse({
        type: "execution.completed",
        executionId: "exec_1",
        status: "COMPLETED",
      });
      expect(result.durationMs).toBeUndefined();
    });
  });

  describe("ExecutionFailedPayloadSchema", () => {
    it("parses valid payload", () => {
      const result = ExecutionFailedPayloadSchema.parse({
        type: "execution.failed",
        executionId: "exec_1",
        error: "Node timeout exceeded",
      });
      expect(result.type).toBe("execution.failed");
      expect(result.error).toBe("Node timeout exceeded");
    });

    it("accepts optional retryable flag", () => {
      const result = ExecutionFailedPayloadSchema.parse({
        type: "execution.failed",
        executionId: "exec_1",
        error: "Transient network error",
        retryable: true,
      });
      expect(result.retryable).toBe(true);
    });

    it("rejects missing error field", () => {
      expect(() =>
        ExecutionFailedPayloadSchema.parse({
          type: "execution.failed",
          executionId: "exec_1",
        })
      ).toThrow();
    });
  });

  describe("ExecutionProgressPayloadSchema", () => {
    it("parses valid payload with all fields", () => {
      const result = ExecutionProgressPayloadSchema.parse({
        type: "execution.progress",
        executionId: "exec_1",
        nodeId: "node_1",
        progress: 0.5,
        message: "Processing batch 3 of 6",
      });
      expect(result.type).toBe("execution.progress");
      expect(result.progress).toBe(0.5);
      expect(result.message).toBe("Processing batch 3 of 6");
    });

    it("parses with only required fields", () => {
      const result = ExecutionProgressPayloadSchema.parse({
        type: "execution.progress",
        executionId: "exec_1",
      });
      expect(result.nodeId).toBeUndefined();
      expect(result.progress).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    it("rejects progress below 0", () => {
      expect(() =>
        ExecutionProgressPayloadSchema.parse({
          type: "execution.progress",
          executionId: "exec_1",
          progress: -0.1,
        })
      ).toThrow();
    });

    it("rejects progress above 1", () => {
      expect(() =>
        ExecutionProgressPayloadSchema.parse({
          type: "execution.progress",
          executionId: "exec_1",
          progress: 1.1,
        })
      ).toThrow();
    });

    it("accepts boundary progress values", () => {
      const zeroResult = ExecutionProgressPayloadSchema.parse({
        type: "execution.progress",
        executionId: "exec_1",
        progress: 0,
      });
      expect(zeroResult.progress).toBe(0);

      const oneResult = ExecutionProgressPayloadSchema.parse({
        type: "execution.progress",
        executionId: "exec_1",
        progress: 1,
      });
      expect(oneResult.progress).toBe(1);
    });
  });
});

describe("Canvas Operation Payloads", () => {
  describe("CanvasOpAppliedPayloadSchema", () => {
    it("parses add_node operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "add_node",
          id: "op_1",
          nodeType: "llm",
          position: { x: 100, y: 200 },
          label: "LLM Node",
          timestamp: Date.now(),
        },
      });
      expect(result.type).toBe("canvas.op_applied");
      expect(result.operation.type).toBe("add_node");
    });

    it("parses remove_node operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "remove_node",
          id: "op_2",
          nodeId: "node_1",
          timestamp: Date.now(),
        },
      });
      expect(result.operation.type).toBe("remove_node");
    });

    it("parses connect operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "connect",
          id: "op_3",
          source: "node_1",
          target: "node_2",
          timestamp: Date.now(),
        },
      });
      expect(result.operation.type).toBe("connect");
    });

    it("parses disconnect operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "disconnect",
          id: "op_4",
          edgeId: "edge_1",
          timestamp: Date.now(),
        },
      });
      expect(result.operation.type).toBe("disconnect");
    });

    it("parses update_config operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "update_config",
          id: "op_5",
          nodeId: "node_1",
          config: { temperature: 0.7 },
          timestamp: Date.now(),
        },
      });
      expect(result.operation.type).toBe("update_config");
    });

    it("parses layout operation", () => {
      const result = CanvasOpAppliedPayloadSchema.parse({
        type: "canvas.op_applied",
        operation: {
          type: "layout",
          id: "op_6",
          direction: "TB",
          timestamp: Date.now(),
        },
      });
      expect(result.operation.type).toBe("layout");
    });

    it("rejects invalid operation type", () => {
      expect(() =>
        CanvasOpAppliedPayloadSchema.parse({
          type: "canvas.op_applied",
          operation: {
            type: "invalid_op",
            id: "op_x",
            timestamp: Date.now(),
          },
        })
      ).toThrow();
    });
  });

  describe("CanvasOpRejectedPayloadSchema", () => {
    it("parses valid rejection with reason", () => {
      const result = CanvasOpRejectedPayloadSchema.parse({
        type: "canvas.op_rejected",
        operation: {
          type: "remove_node",
          id: "op_1",
          nodeId: "node_1",
          timestamp: Date.now(),
        },
        reason: "Node is locked",
      });
      expect(result.type).toBe("canvas.op_rejected");
      expect(result.reason).toBe("Node is locked");
    });

    it("rejects missing reason", () => {
      expect(() =>
        CanvasOpRejectedPayloadSchema.parse({
          type: "canvas.op_rejected",
          operation: {
            type: "remove_node",
            id: "op_1",
            nodeId: "node_1",
            timestamp: Date.now(),
          },
        })
      ).toThrow();
    });
  });
});

describe("Session Payloads", () => {
  describe("SessionStartedPayloadSchema", () => {
    it("parses valid payload", () => {
      const result = SessionStartedPayloadSchema.parse({
        type: "session.started",
        sessionId: "session_1",
      });
      expect(result.type).toBe("session.started");
      expect(result.sessionId).toBe("session_1");
    });

    it("rejects missing sessionId", () => {
      expect(() =>
        SessionStartedPayloadSchema.parse({
          type: "session.started",
        })
      ).toThrow();
    });
  });

  describe("SessionResumedPayloadSchema", () => {
    it("parses valid payload", () => {
      const result = SessionResumedPayloadSchema.parse({
        type: "session.resumed",
        sessionId: "session_1",
        lastSequence: 42,
      });
      expect(result.type).toBe("session.resumed");
      expect(result.sessionId).toBe("session_1");
      expect(result.lastSequence).toBe(42);
    });

    it("rejects missing lastSequence", () => {
      expect(() =>
        SessionResumedPayloadSchema.parse({
          type: "session.resumed",
          sessionId: "session_1",
        })
      ).toThrow();
    });

    it("accepts zero lastSequence", () => {
      const result = SessionResumedPayloadSchema.parse({
        type: "session.resumed",
        sessionId: "session_1",
        lastSequence: 0,
      });
      expect(result.lastSequence).toBe(0);
    });
  });
});

describe("RuntimeEventPayloadSchema discriminated union", () => {
  it("routes to correct schema based on type", () => {
    const executionPayload = RuntimeEventPayloadSchema.parse({
      type: "execution.started",
      executionId: "exec_1",
      status: "RUNNING",
    });
    expect(executionPayload.type).toBe("execution.started");

    const sessionPayload = RuntimeEventPayloadSchema.parse({
      type: "session.started",
      sessionId: "session_1",
    });
    expect(sessionPayload.type).toBe("session.started");
  });

  it("rejects unknown event type", () => {
    expect(() =>
      RuntimeEventPayloadSchema.parse({
        type: "unknown.event",
        data: "anything",
      })
    ).toThrow();
  });

  it("rejects payload with wrong fields for type", () => {
    expect(() =>
      RuntimeEventPayloadSchema.parse({
        type: "execution.started",
      })
    ).toThrow();
  });
});
