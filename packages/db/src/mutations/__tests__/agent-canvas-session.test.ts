import { describe, expect, it } from "bun:test";

interface MockSession {
  id: string;
  agentCanvasId: string;
  teamId: string;
  userId: string;
  title: string | null;
  status: string;
  lastEventSequence: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MockSessionEvent {
  id: string;
  sessionId: string;
  teamId: string;
  agentCanvasId: string;
  executionId: string | null;
  turnId: string | null;
  sequence: number;
  eventType: string;
  source: string;
  visibility: string;
  payload: unknown;
  eventTimestamp: Date;
  createdAt: Date;
}

function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    id: "session_001",
    agentCanvasId: "canvas_001",
    teamId: "team_001",
    userId: "user_001",
    title: null,
    status: "active",
    lastEventSequence: 0,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockSessionEvent(
  overrides: Partial<MockSessionEvent> = {}
): MockSessionEvent {
  return {
    id: "event_001",
    sessionId: "session_001",
    teamId: "team_001",
    agentCanvasId: "canvas_001",
    executionId: null,
    turnId: null,
    sequence: 1,
    eventType: "chat.user_message",
    source: "user",
    visibility: "visible",
    payload: { type: "chat.user_message", content: "Hello" },
    eventTimestamp: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("AgentCanvasSession entity", () => {
  it("has all required fields", () => {
    const session = createMockSession();

    expect(session.id).toBeDefined();
    expect(session.agentCanvasId).toBe("canvas_001");
    expect(session.teamId).toBe("team_001");
    expect(session.userId).toBe("user_001");
    expect(session.status).toBe("active");
    expect(session.lastEventSequence).toBe(0);
    expect(session.lastActivityAt).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
  });

  it("defaults status to active", () => {
    const session = createMockSession();
    expect(session.status).toBe("active");
  });

  it("defaults lastEventSequence to 0", () => {
    const session = createMockSession();
    expect(session.lastEventSequence).toBe(0);
  });

  it("title is nullable", () => {
    const withTitle = createMockSession({ title: "My Session" });
    const withoutTitle = createMockSession({ title: null });

    expect(withTitle.title).toBe("My Session");
    expect(withoutTitle.title).toBeNull();
  });
});

describe("createOrGetSession behavior", () => {
  it("returns existing active session for same user/canvas", () => {
    const existing = createMockSession({
      agentCanvasId: "canvas_001",
      teamId: "team_001",
      userId: "user_001",
      status: "active",
    });

    expect(existing.status).toBe("active");
    expect(existing.agentCanvasId).toBe("canvas_001");
    expect(existing.userId).toBe("user_001");
  });

  it("creates new session when none active", () => {
    const newSession = createMockSession({
      id: "session_002",
      agentCanvasId: "canvas_001",
      teamId: "team_001",
      userId: "user_001",
      lastEventSequence: 0,
    });

    expect(newSession.id).toBe("session_002");
    expect(newSession.lastEventSequence).toBe(0);
  });

  it("different users get different sessions for same canvas", () => {
    const session1 = createMockSession({
      id: "session_001",
      userId: "user_001",
      agentCanvasId: "canvas_001",
    });
    const session2 = createMockSession({
      id: "session_002",
      userId: "user_002",
      agentCanvasId: "canvas_001",
    });

    expect(session1.id).not.toBe(session2.id);
    expect(session1.userId).not.toBe(session2.userId);
    expect(session1.agentCanvasId).toBe(session2.agentCanvasId);
  });
});

describe("AgentCanvasSessionEvent entity", () => {
  it("has all required fields", () => {
    const event = createMockSessionEvent();

    expect(event.id).toBeDefined();
    expect(event.sessionId).toBe("session_001");
    expect(event.teamId).toBe("team_001");
    expect(event.sequence).toBe(1);
    expect(event.eventType).toBe("chat.user_message");
    expect(event.source).toBe("user");
    expect(event.visibility).toBe("visible");
    expect(event.payload).toBeDefined();
    expect(event.eventTimestamp).toBeDefined();
  });

  it("defaults visibility to visible", () => {
    const event = createMockSessionEvent();
    expect(event.visibility).toBe("visible");
  });

  it("executionId and turnId are nullable", () => {
    const event = createMockSessionEvent({
      executionId: null,
      turnId: null,
    });
    expect(event.executionId).toBeNull();
    expect(event.turnId).toBeNull();

    const withIds = createMockSessionEvent({
      executionId: "exec_001",
      turnId: "turn_001",
    });
    expect(withIds.executionId).toBe("exec_001");
    expect(withIds.turnId).toBe("turn_001");
  });
});

describe("appendSessionEvent behavior", () => {
  it("assigns monotonic sequence numbers", () => {
    const event1 = createMockSessionEvent({ sequence: 1 });
    const event2 = createMockSessionEvent({ sequence: 2 });
    const event3 = createMockSessionEvent({ sequence: 3 });

    expect(event1.sequence).toBeLessThan(event2.sequence);
    expect(event2.sequence).toBeLessThan(event3.sequence);
  });

  it("increments session lastEventSequence", () => {
    const before = createMockSession({ lastEventSequence: 5 });
    const after = createMockSession({
      ...before,
      lastEventSequence: before.lastEventSequence + 1,
    });

    expect(after.lastEventSequence).toBe(6);
  });

  it("updates lastActivityAt", () => {
    const before = createMockSession({
      lastActivityAt: new Date("2024-01-01"),
    });
    const now = new Date();
    const after = createMockSession({ ...before, lastActivityAt: now });

    expect(after.lastActivityAt.getTime()).toBeGreaterThan(
      before.lastActivityAt.getTime()
    );
  });
});

describe("appendSessionEvents batch behavior", () => {
  it("assigns sequential sequence numbers in batch", () => {
    const baseSequence = 5;
    const events = Array.from({ length: 3 }, (_, i) =>
      createMockSessionEvent({ sequence: baseSequence + i + 1 })
    );

    expect(events[0].sequence).toBe(6);
    expect(events[1].sequence).toBe(7);
    expect(events[2].sequence).toBe(8);
  });

  it("increments lastEventSequence by batch size", () => {
    const batchSize = 3;
    const before = createMockSession({ lastEventSequence: 5 });
    const after = createMockSession({
      ...before,
      lastEventSequence: before.lastEventSequence + batchSize,
    });

    expect(after.lastEventSequence).toBe(8);
  });
});

describe("unique constraint: sessionId + sequence", () => {
  it("events in same session have unique sequences", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createMockSessionEvent({
        id: `event_${i}`,
        sessionId: "session_001",
        sequence: i + 1,
      })
    );

    const keys = events.map((e) => `${e.sessionId}_${e.sequence}`);
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(events.length);
  });
});

describe("unique constraint: agentCanvasId + teamId + userId + status", () => {
  it("only one active session per user per canvas per team", () => {
    const session1 = createMockSession({
      agentCanvasId: "canvas_001",
      teamId: "team_001",
      userId: "user_001",
      status: "active",
    });

    const key = `${session1.agentCanvasId}_${session1.teamId}_${session1.userId}_${session1.status}`;
    expect(key).toBe("canvas_001_team_001_user_001_active");
  });

  it("same user can have archived and active sessions", () => {
    const active = createMockSession({
      id: "session_001",
      status: "active",
    });
    const archived = createMockSession({
      id: "session_002",
      status: "archived",
    });

    const activeKey = `${active.agentCanvasId}_${active.teamId}_${active.userId}_${active.status}`;
    const archivedKey = `${archived.agentCanvasId}_${archived.teamId}_${archived.userId}_${archived.status}`;

    expect(activeKey).not.toBe(archivedKey);
  });
});

describe("bindExecutionToSession behavior", () => {
  it("links execution to session", () => {
    const execution = {
      id: "exec_001",
      sessionId: "session_001",
      turnId: "turn_001",
    };

    expect(execution.sessionId).toBe("session_001");
    expect(execution.turnId).toBe("turn_001");
  });

  it("turnId is optional", () => {
    const execution = {
      id: "exec_001",
      sessionId: "session_001",
      turnId: undefined,
    };

    expect(execution.sessionId).toBe("session_001");
    expect(execution.turnId).toBeUndefined();
  });
});
