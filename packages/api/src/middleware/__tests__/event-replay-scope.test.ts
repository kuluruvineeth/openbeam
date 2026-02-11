import { describe, expect, it, mock } from "bun:test";
import { TRPCError } from "@trpc/server";
import {
  replaySessionEvents,
  replaySessionEventsAfterSequence,
  verifyScopedSubscription,
} from "../event-replay-scope";

const mockSession = {
  id: "sess_1",
  teamId: "team_1",
  userId: "user_1",
  status: "active",
  agentCanvasId: "canvas_1",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastActivityAt: null,
  title: null,
  lastEventSequence: 0,
};

const mockEvents = [
  { id: "ev_1", sequence: 1 },
  { id: "ev_2", sequence: 2 },
];

const mockVerify = mock((_args: unknown) =>
  Promise.resolve(mockSession as typeof mockSession)
);
const mockListEvents = mock(
  (_db: unknown, _sessionId: string, _opts?: unknown) =>
    Promise.resolve(mockEvents as unknown[])
);
const mockListAfter = mock(
  (_db: unknown, _sessionId: string, _seq: number, _limit?: number) =>
    Promise.resolve(mockEvents as unknown[])
);

mock.module("../session-auth", () => ({
  verifySessionOwnership: (args: unknown) => mockVerify(args),
}));

mock.module("@openplane/db", () => ({
  listSessionEvents: (db: unknown, sessionId: string, opts?: unknown) =>
    mockListEvents(db, sessionId, opts),
  listSessionEventsAfterSequence: (
    db: unknown,
    sessionId: string,
    seq: number,
    limit?: number
  ) => mockListAfter(db, sessionId, seq, limit),
}));

function resetMocks() {
  mockVerify.mockReset();
  mockVerify.mockResolvedValue(mockSession);
  mockListEvents.mockReset();
  mockListEvents.mockResolvedValue(mockEvents as unknown[]);
  mockListAfter.mockReset();
  mockListAfter.mockResolvedValue(mockEvents as unknown[]);
}

const scope = {
  db: {} as never,
  sessionId: "sess_1",
  teamId: "team_1",
  userId: "user_1",
};

describe("replaySessionEvents", () => {
  it("verifies ownership before listing events", async () => {
    resetMocks();
    await replaySessionEvents(scope);
    expect(mockVerify).toHaveBeenCalled();
  });

  it("passes limit and cursorSequence options", async () => {
    resetMocks();
    await replaySessionEvents(scope, { limit: 50, cursorSequence: 10 });
    expect(mockListEvents).toHaveBeenCalledWith(scope.db, scope.sessionId, {
      limit: 50,
      cursorSequence: 10,
    });
  });

  it("returns events from listSessionEvents", async () => {
    resetMocks();
    const result = await replaySessionEvents(scope);
    expect(result).toHaveLength(2);
  });
});

describe("replaySessionEventsAfterSequence", () => {
  it("verifies ownership before listing events", async () => {
    resetMocks();
    await replaySessionEventsAfterSequence(scope, { afterSequence: 5 });
    expect(mockVerify).toHaveBeenCalled();
  });

  it("passes afterSequence and limit to query", async () => {
    resetMocks();
    await replaySessionEventsAfterSequence(scope, {
      afterSequence: 5,
      limit: 100,
    });
    expect(mockListAfter).toHaveBeenCalledWith(
      scope.db,
      scope.sessionId,
      5,
      100
    );
  });
});

describe("verifyScopedSubscription", () => {
  it("returns session when active", async () => {
    resetMocks();
    const result = await verifyScopedSubscription(scope);
    expect(result.id).toBe("sess_1");
    expect(result.status).toBe("active");
  });

  it("throws BAD_REQUEST when session is archived", async () => {
    resetMocks();
    mockVerify.mockResolvedValue({ ...mockSession, status: "archived" });

    try {
      await verifyScopedSubscription(scope);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("propagates NOT_FOUND from ownership check", async () => {
    resetMocks();
    mockVerify.mockRejectedValue(
      new TRPCError({ code: "NOT_FOUND", message: "Session not found" })
    );

    try {
      await verifyScopedSubscription(scope);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("propagates FORBIDDEN from ownership check", async () => {
    resetMocks();
    mockVerify.mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "Session access denied" })
    );

    try {
      await verifyScopedSubscription(scope);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});
