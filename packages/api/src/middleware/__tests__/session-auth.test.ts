import { describe, expect, it, mock } from "bun:test";
import { TRPCError } from "@trpc/server";
import { verifySessionOwnership } from "../session-auth";

const mockFindSession = mock(
  (_db: unknown, _sessionId: string, _teamId: string) =>
    Promise.resolve(null as Record<string, unknown> | null)
);

mock.module("@openplane/db", () => ({
  findSessionById: (db: unknown, sessionId: string, teamId: string) =>
    mockFindSession(db, sessionId, teamId),
}));

describe("verifySessionOwnership", () => {
  it("returns session when teamId and userId match", async () => {
    const session = {
      id: "sess_1",
      teamId: "team_1",
      userId: "user_1",
      status: "active",
    };

    mockFindSession.mockResolvedValue(session);

    const result = await verifySessionOwnership({
      db: {} as never,
      sessionId: "sess_1",
      teamId: "team_1",
      userId: "user_1",
    });

    expect(result.id).toBe("sess_1");
    expect(result.userId).toBe("user_1");
  });

  it("throws NOT_FOUND when session does not exist", async () => {
    mockFindSession.mockResolvedValue(null);

    try {
      await verifySessionOwnership({
        db: {} as never,
        sessionId: "sess_missing",
        teamId: "team_1",
        userId: "user_1",
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("throws FORBIDDEN when userId does not match", async () => {
    mockFindSession.mockResolvedValue({
      id: "sess_1",
      teamId: "team_1",
      userId: "user_other",
      status: "active",
    });

    try {
      await verifySessionOwnership({
        db: {} as never,
        sessionId: "sess_1",
        teamId: "team_1",
        userId: "user_attacker",
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("passes teamId to findSessionById for team scoping", async () => {
    mockFindSession.mockResolvedValue({
      id: "sess_1",
      teamId: "team_1",
      userId: "user_1",
      status: "active",
    });

    const db = {} as never;
    await verifySessionOwnership({
      db,
      sessionId: "sess_1",
      teamId: "team_1",
      userId: "user_1",
    });

    expect(mockFindSession).toHaveBeenCalledWith(db, "sess_1", "team_1");
  });
});
