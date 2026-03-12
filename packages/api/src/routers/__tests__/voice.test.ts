import { describe, expect, it, mock } from "bun:test";

const noopFn = mock(() => Promise.resolve(null));

mock.module("@openbeam/db", () => ({
  __esModule: true,
  default: {},
  countVoiceNotes: noopFn,
  createVoiceNote: noopFn,
  createVoiceSession: noopFn,
  deleteVoiceNote: noopFn,
  endVoiceSession: noopFn,
  findActiveVoiceSession: noopFn,
  findVoiceNoteById: noopFn,
  findVoiceSettings: noopFn,
  getVoiceSessionStats: noopFn,
  listVoiceNotes: noopFn,
  listVoiceSessions: noopFn,
  upsertVoiceSettings: noopFn,
  getTeamMembership: noopFn,
  getUserById: noopFn,
  verifyConnectorOwnership: noopFn,
}));
mock.module("@openbeam/services", () => ({
  __esModule: true,
  default: {},
}));
mock.module("@openbeam/redis", () => ({
  default: {},
  rateLimiter: { checkConnectorRateLimit: noopFn },
  redis: {},
}));

const { voiceRouter } = await import("../voice");

describe("voiceRouter", () => {
  const procedures = voiceRouter._def.procedures as Record<string, unknown>;

  describe("procedure registry", () => {
    const expectedProcedures = [
      "listNotes",
      "getNote",
      "createNote",
      "deleteNote",
      "getSettings",
      "updateSettings",
      "getToken",
      "getActiveSession",
      "endSession",
      "listSessions",
      "getStats",
    ];

    for (const name of expectedProcedures) {
      it(`has "${name}" procedure`, () => {
        expect(procedures[name]).toBeDefined();
      });
    }

    it("has exactly 11 procedures", () => {
      expect(Object.keys(procedures)).toHaveLength(11);
    });
  });

  describe("procedure types", () => {
    function getProcedureType(name: string): string | undefined {
      const proc = procedures[name] as { _def?: { type?: string } } | undefined;
      return proc?._def?.type;
    }

    it("listNotes is a query", () => {
      expect(getProcedureType("listNotes")).toBe("query");
    });

    it("getNote is a query", () => {
      expect(getProcedureType("getNote")).toBe("query");
    });

    it("createNote is a mutation", () => {
      expect(getProcedureType("createNote")).toBe("mutation");
    });

    it("deleteNote is a mutation", () => {
      expect(getProcedureType("deleteNote")).toBe("mutation");
    });

    it("getSettings is a query", () => {
      expect(getProcedureType("getSettings")).toBe("query");
    });

    it("updateSettings is a mutation", () => {
      expect(getProcedureType("updateSettings")).toBe("mutation");
    });

    it("getToken is a mutation", () => {
      expect(getProcedureType("getToken")).toBe("mutation");
    });

    it("getActiveSession is a query", () => {
      expect(getProcedureType("getActiveSession")).toBe("query");
    });

    it("endSession is a mutation", () => {
      expect(getProcedureType("endSession")).toBe("mutation");
    });

    it("listSessions is a query", () => {
      expect(getProcedureType("listSessions")).toBe("query");
    });

    it("getStats is a query", () => {
      expect(getProcedureType("getStats")).toBe("query");
    });
  });
});
