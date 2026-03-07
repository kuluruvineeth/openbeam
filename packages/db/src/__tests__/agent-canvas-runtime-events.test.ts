import { describe, expect, it } from "bun:test";
import {
  BuildCanvasInputSchema,
  CanvasSessionSchema,
  GetOrCreateSessionInputSchema,
  GetSessionEventsInputSchema,
  ListSessionsInputSchema,
  OnSessionEventInputSchema,
  SessionStatusSchema,
} from "@openbeam/types/canvas/session";
import {
  appendSessionEvent,
  appendSessionEvents,
  bindExecutionToSession,
  createOrGetSession,
  touchSession,
} from "../mutations/agent-canvas-session";
import {
  findLatestSession,
  findSessionById,
  listSessionEvents,
  listSessionEventsAfterSequence,
  listSessions,
} from "../queries/agent-canvas-session";

describe("mutation exports", () => {
  it("createOrGetSession is a function", () => {
    expect(typeof createOrGetSession).toBe("function");
  });

  it("appendSessionEvent is a function", () => {
    expect(typeof appendSessionEvent).toBe("function");
  });

  it("appendSessionEvents is a function", () => {
    expect(typeof appendSessionEvents).toBe("function");
  });

  it("touchSession is a function", () => {
    expect(typeof touchSession).toBe("function");
  });

  it("bindExecutionToSession is a function", () => {
    expect(typeof bindExecutionToSession).toBe("function");
  });
});

describe("query exports", () => {
  it("findSessionById is a function", () => {
    expect(typeof findSessionById).toBe("function");
  });

  it("findLatestSession is a function", () => {
    expect(typeof findLatestSession).toBe("function");
  });

  it("listSessions is a function", () => {
    expect(typeof listSessions).toBe("function");
  });

  it("listSessionEvents is a function", () => {
    expect(typeof listSessionEvents).toBe("function");
  });

  it("listSessionEventsAfterSequence is a function", () => {
    expect(typeof listSessionEventsAfterSequence).toBe("function");
  });
});

describe("function arities", () => {
  it("createOrGetSession accepts 2 params (db, data)", () => {
    expect(createOrGetSession.length).toBe(2);
  });

  it("appendSessionEvent accepts 3 params (db, sessionId, event)", () => {
    expect(appendSessionEvent.length).toBe(3);
  });

  it("appendSessionEvents accepts 3 params (db, sessionId, events)", () => {
    expect(appendSessionEvents.length).toBe(3);
  });

  it("touchSession accepts 2 params (db, sessionId)", () => {
    expect(touchSession.length).toBe(2);
  });

  it("bindExecutionToSession accepts 3+ params (db, executionId, sessionId, turnId?)", () => {
    expect(bindExecutionToSession.length).toBeGreaterThanOrEqual(3);
  });

  it("findSessionById accepts 3 params (db, sessionId, teamId)", () => {
    expect(findSessionById.length).toBe(3);
  });

  it("findLatestSession accepts 4 params (db, canvasId, teamId, userId)", () => {
    expect(findLatestSession.length).toBe(4);
  });

  it("listSessions accepts 3+ params (db, canvasId, teamId, options?)", () => {
    expect(listSessions.length).toBeGreaterThanOrEqual(3);
  });

  it("listSessionEvents accepts 2+ params (db, sessionId, options?)", () => {
    expect(listSessionEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("listSessionEventsAfterSequence accepts 3+ params", () => {
    expect(listSessionEventsAfterSequence.length).toBeGreaterThanOrEqual(3);
  });
});

describe("SessionStatusSchema", () => {
  it("parses 'active'", () => {
    expect(SessionStatusSchema.parse("active")).toBe("active");
  });

  it("parses 'archived'", () => {
    expect(SessionStatusSchema.parse("archived")).toBe("archived");
  });

  it("rejects invalid status", () => {
    expect(() => SessionStatusSchema.parse("deleted")).toThrow();
  });
});

describe("CanvasSessionSchema", () => {
  const validSession = {
    id: "sess_001",
    agentCanvasId: "canvas_001",
    teamId: "team_001",
    userId: "user_001",
    status: "active" as const,
    lastEventSequence: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  it("parses valid session", () => {
    const result = CanvasSessionSchema.parse(validSession);
    expect(result.id).toBe("sess_001");
    expect(result.status).toBe("active");
    expect(result.lastEventSequence).toBe(0);
  });

  it("title is optional", () => {
    const withTitle = CanvasSessionSchema.parse({
      ...validSession,
      title: "Research session",
    });
    expect(withTitle.title).toBe("Research session");

    const withoutTitle = CanvasSessionSchema.parse(validSession);
    expect(withoutTitle.title).toBeUndefined();
  });

  it("lastActivityAt is optional", () => {
    const with_ = CanvasSessionSchema.parse({
      ...validSession,
      lastActivityAt: "2025-01-01T00:00:00.000Z",
    });
    expect(with_.lastActivityAt).toBeDefined();

    const without = CanvasSessionSchema.parse(validSession);
    expect(without.lastActivityAt).toBeUndefined();
  });

  it("rejects negative lastEventSequence", () => {
    expect(() =>
      CanvasSessionSchema.parse({ ...validSession, lastEventSequence: -1 })
    ).toThrow();
  });

  it("rejects non-integer lastEventSequence", () => {
    expect(() =>
      CanvasSessionSchema.parse({ ...validSession, lastEventSequence: 1.5 })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => CanvasSessionSchema.parse({})).toThrow();
    expect(() => CanvasSessionSchema.parse({ id: "x" })).toThrow();
  });
});

describe("OnSessionEventInputSchema", () => {
  it("parses valid input with sessionId only", () => {
    const result = OnSessionEventInputSchema.parse({
      sessionId: "sess_001",
    });
    expect(result.sessionId).toBe("sess_001");
    expect(result.lastSequence).toBeUndefined();
  });

  it("parses valid input with lastSequence", () => {
    const result = OnSessionEventInputSchema.parse({
      sessionId: "sess_001",
      lastSequence: 42,
    });
    expect(result.sessionId).toBe("sess_001");
    expect(result.lastSequence).toBe(42);
  });

  it("rejects missing sessionId", () => {
    expect(() => OnSessionEventInputSchema.parse({})).toThrow();
  });

  it("rejects empty sessionId", () => {
    expect(() => OnSessionEventInputSchema.parse({ sessionId: "" })).toThrow();
  });

  it("rejects negative lastSequence", () => {
    expect(() =>
      OnSessionEventInputSchema.parse({
        sessionId: "sess_001",
        lastSequence: -1,
      })
    ).toThrow();
  });

  it("rejects non-integer lastSequence", () => {
    expect(() =>
      OnSessionEventInputSchema.parse({
        sessionId: "sess_001",
        lastSequence: 3.14,
      })
    ).toThrow();
  });
});

describe("GetOrCreateSessionInputSchema", () => {
  it("parses valid input", () => {
    const result = GetOrCreateSessionInputSchema.parse({
      canvasId: "canvas_001",
    });
    expect(result.canvasId).toBe("canvas_001");
    expect(result.sessionId).toBeUndefined();
  });

  it("parses with optional sessionId", () => {
    const result = GetOrCreateSessionInputSchema.parse({
      canvasId: "canvas_001",
      sessionId: "sess_001",
    });
    expect(result.sessionId).toBe("sess_001");
  });

  it("rejects empty canvasId", () => {
    expect(() =>
      GetOrCreateSessionInputSchema.parse({ canvasId: "" })
    ).toThrow();
  });

  it("rejects missing canvasId", () => {
    expect(() => GetOrCreateSessionInputSchema.parse({})).toThrow();
  });
});

describe("GetSessionEventsInputSchema", () => {
  it("parses minimal input", () => {
    const result = GetSessionEventsInputSchema.parse({
      sessionId: "sess_001",
    });
    expect(result.sessionId).toBe("sess_001");
    expect(result.limit).toBe(100);
  });

  it("parses with custom limit and cursor", () => {
    const result = GetSessionEventsInputSchema.parse({
      sessionId: "sess_001",
      limit: 50,
      cursorSequence: 10,
    });
    expect(result.limit).toBe(50);
    expect(result.cursorSequence).toBe(10);
  });

  it("rejects limit over 500", () => {
    expect(() =>
      GetSessionEventsInputSchema.parse({
        sessionId: "sess_001",
        limit: 501,
      })
    ).toThrow();
  });

  it("rejects negative cursorSequence", () => {
    expect(() =>
      GetSessionEventsInputSchema.parse({
        sessionId: "sess_001",
        cursorSequence: -1,
      })
    ).toThrow();
  });
});

describe("ListSessionsInputSchema", () => {
  it("parses minimal input with defaults", () => {
    const result = ListSessionsInputSchema.parse({
      canvasId: "canvas_001",
    });
    expect(result.canvasId).toBe("canvas_001");
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("parses with custom pagination", () => {
    const result = ListSessionsInputSchema.parse({
      canvasId: "canvas_001",
      limit: 50,
      offset: 10,
    });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it("rejects limit over 100", () => {
    expect(() =>
      ListSessionsInputSchema.parse({ canvasId: "canvas_001", limit: 101 })
    ).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() =>
      ListSessionsInputSchema.parse({ canvasId: "canvas_001", offset: -1 })
    ).toThrow();
  });
});

describe("BuildCanvasInputSchema", () => {
  it("parses valid input", () => {
    const result = BuildCanvasInputSchema.parse({
      prompt: "Build a dashboard",
      sessionId: "sess_001",
    });
    expect(result.prompt).toBe("Build a dashboard");
    expect(result.sessionId).toBe("sess_001");
  });

  it("rejects empty prompt", () => {
    expect(() =>
      BuildCanvasInputSchema.parse({ prompt: "", sessionId: "sess_001" })
    ).toThrow();
  });

  it("rejects prompt over 10000 chars", () => {
    expect(() =>
      BuildCanvasInputSchema.parse({
        prompt: "x".repeat(10_001),
        sessionId: "sess_001",
      })
    ).toThrow();
  });

  it("rejects empty sessionId", () => {
    expect(() =>
      BuildCanvasInputSchema.parse({
        prompt: "Build something",
        sessionId: "",
      })
    ).toThrow();
  });

  it("accepts attachments array", () => {
    const result = BuildCanvasInputSchema.parse({
      prompt: "Analyze this",
      sessionId: "sess_001",
      attachments: [
        {
          type: "image",
          url: "https://example.com/img.png",
          name: "screenshot.png",
        },
      ],
    });
    expect(result.attachments).toHaveLength(1);
  });

  it("rejects more than 10 attachments", () => {
    const attachments = Array.from({ length: 11 }, (_, i) => ({
      type: "image" as const,
      url: `https://example.com/${i}.png`,
      name: `file_${i}.png`,
    }));
    expect(() =>
      BuildCanvasInputSchema.parse({
        prompt: "Test",
        sessionId: "sess_001",
        attachments,
      })
    ).toThrow();
  });
});
