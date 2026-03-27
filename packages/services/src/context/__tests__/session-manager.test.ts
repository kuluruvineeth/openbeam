import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ContextSessionManager } from "../session-manager";

type MockFn = ReturnType<typeof mock>;

const TEAM_ID = "team_test";
const USER_ID = "user_1";
const AGENT_ID = "agent_1";
const SESSION_ID = "session_abc";

type SessionMessage = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  parts: unknown;
  tokenCount: number;
  createdAt: Date;
};

const SAMPLE_SESSION = {
  id: SESSION_ID,
  teamId: TEAM_ID,
  userId: USER_ID,
  agentId: null as string | null,
  totalTokens: 0,
  archiveCount: 0,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [] as SessionMessage[],
  extractions: [] as unknown[],
};

const SAMPLE_MESSAGE = {
  id: "msg_1",
  sessionId: SESSION_ID,
  role: "user",
  content: "Hello",
  parts: null,
  tokenCount: 2,
  createdAt: new Date(),
};

type SampleSession = typeof SAMPLE_SESSION;

const dbMocks = {
  createContextSession: mock(() =>
    Promise.resolve(SAMPLE_SESSION as SampleSession | null)
  ),
  addContextSessionMessage: mock(() => Promise.resolve(SAMPLE_MESSAGE)),
  updateContextSessionStatus: mock(() =>
    Promise.resolve(SAMPLE_SESSION as SampleSession | null)
  ),
  updateContextSessionTokens: mock(() =>
    Promise.resolve(SAMPLE_SESSION as SampleSession | null)
  ),
  findContextSession: mock(() =>
    Promise.resolve(SAMPLE_SESSION as SampleSession | null)
  ),
  listContextSessions: mock(() => Promise.resolve([SAMPLE_SESSION])),
};

mock.module("@openbeam/db", () => dbMocks);

const mockDb = {
  contextSession: {
    delete: mock(() => Promise.resolve(SAMPLE_SESSION)),
  },
} as unknown;

function resetAllMocks(): void {
  for (const fn of Object.values(dbMocks)) {
    (fn as MockFn).mockReset();
  }
  (
    mockDb as { contextSession: { delete: MockFn } }
  ).contextSession.delete.mockReset();
}

describe("ContextSessionManager", () => {
  let manager: ContextSessionManager;

  beforeEach(() => {
    manager = new ContextSessionManager(mockDb as never);
    resetAllMocks();
    dbMocks.createContextSession.mockReturnValue(
      Promise.resolve(SAMPLE_SESSION)
    );
    dbMocks.findContextSession.mockReturnValue(Promise.resolve(SAMPLE_SESSION));
    dbMocks.addContextSessionMessage.mockReturnValue(
      Promise.resolve(SAMPLE_MESSAGE)
    );
    dbMocks.updateContextSessionTokens.mockReturnValue(
      Promise.resolve(SAMPLE_SESSION)
    );
    dbMocks.updateContextSessionStatus.mockReturnValue(
      Promise.resolve(SAMPLE_SESSION)
    );
    dbMocks.listContextSessions.mockReturnValue(
      Promise.resolve([SAMPLE_SESSION])
    );
    (
      mockDb as { contextSession: { delete: MockFn } }
    ).contextSession.delete.mockReturnValue(Promise.resolve(SAMPLE_SESSION));
  });

  describe("create", () => {
    it("calls createContextSession with correct params", async () => {
      const result = await manager.create(TEAM_ID, USER_ID, AGENT_ID);

      expect(dbMocks.createContextSession).toHaveBeenCalledTimes(1);
      expect(dbMocks.createContextSession).toHaveBeenCalledWith(mockDb, {
        teamId: TEAM_ID,
        userId: USER_ID,
        agentId: AGENT_ID,
      });
      expect(result.id).toBe(SESSION_ID);
    });

    it("creates session without agentId", async () => {
      await manager.create(TEAM_ID, USER_ID);

      expect(dbMocks.createContextSession).toHaveBeenCalledWith(mockDb, {
        teamId: TEAM_ID,
        userId: USER_ID,
        agentId: undefined,
      });
    });
  });

  describe("addMessage", () => {
    it("estimates tokens and calls addContextSessionMessage", async () => {
      const content = "Hello world";
      const expectedTokens = Math.ceil(content.length * 0.25);

      await manager.addMessage(SESSION_ID, "user", content);

      expect(dbMocks.addContextSessionMessage).toHaveBeenCalledTimes(1);
      expect(dbMocks.addContextSessionMessage).toHaveBeenCalledWith(mockDb, {
        sessionId: SESSION_ID,
        role: "user",
        content,
        parts: undefined,
        tokenCount: expectedTokens,
      });
    });

    it("updates session total tokens", async () => {
      await manager.addMessage(SESSION_ID, "user", "Hello");

      expect(dbMocks.updateContextSessionTokens).toHaveBeenCalledTimes(1);
      const expectedTokens = Math.ceil("Hello".length * 0.25);
      expect(dbMocks.updateContextSessionTokens).toHaveBeenCalledWith(
        mockDb,
        SESSION_ID,
        SAMPLE_SESSION.totalTokens + expectedTokens
      );
    });

    it("triggers auto-commit when threshold exceeded", async () => {
      const highTokenSession = {
        ...SAMPLE_SESSION,
        totalTokens: 7900,
        status: "active",
      };
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve(highTokenSession)
      );

      const longContent = "x".repeat(500);

      await manager.addMessage(SESSION_ID, "user", longContent);

      expect(dbMocks.updateContextSessionStatus).toHaveBeenCalledWith(
        mockDb,
        SESSION_ID,
        "committed"
      );
    });

    it("does not auto-commit when below threshold", async () => {
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({ ...SAMPLE_SESSION, totalTokens: 100 })
      );

      await manager.addMessage(SESSION_ID, "user", "Short");

      expect(dbMocks.updateContextSessionStatus).not.toHaveBeenCalled();
    });

    it("does not auto-commit when session is already committed", async () => {
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({
          ...SAMPLE_SESSION,
          totalTokens: 9000,
          status: "committed",
        })
      );

      await manager.addMessage(SESSION_ID, "user", "x".repeat(100));

      expect(dbMocks.updateContextSessionStatus).not.toHaveBeenCalled();
    });
  });

  describe("getMessages", () => {
    it("returns messages ordered by createdAt", async () => {
      const messages = [
        { ...SAMPLE_MESSAGE, id: "msg_1", createdAt: new Date("2026-01-01") },
        { ...SAMPLE_MESSAGE, id: "msg_2", createdAt: new Date("2026-01-02") },
      ];
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({ ...SAMPLE_SESSION, messages })
      );

      const result = await manager.getMessages(SESSION_ID);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("msg_1");
    });

    it("respects limit parameter", async () => {
      const messages = [
        { ...SAMPLE_MESSAGE, id: "msg_1" },
        { ...SAMPLE_MESSAGE, id: "msg_2" },
        { ...SAMPLE_MESSAGE, id: "msg_3" },
      ];
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({ ...SAMPLE_SESSION, messages })
      );

      const result = await manager.getMessages(SESSION_ID, 2);

      expect(result).toHaveLength(2);
    });

    it("returns empty array when session not found", async () => {
      dbMocks.findContextSession.mockReturnValue(Promise.resolve(null));

      const result = await manager.getMessages(SESSION_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe("commit", () => {
    it("updates status to committed and returns workflowId", async () => {
      const result = await manager.commit(SESSION_ID);

      expect(dbMocks.updateContextSessionStatus).toHaveBeenCalledWith(
        mockDb,
        SESSION_ID,
        "committed"
      );
      expect(result.workflowId).toBe(`memory-extraction:${SESSION_ID}`);
    });

    it("generates deterministic workflowId from sessionId", async () => {
      const result1 = await manager.commit(SESSION_ID);

      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({ ...SAMPLE_SESSION, status: "active" })
      );
      dbMocks.updateContextSessionStatus.mockReset();
      dbMocks.updateContextSessionStatus.mockReturnValue(
        Promise.resolve(SAMPLE_SESSION)
      );

      const result2 = await manager.commit(SESSION_ID);

      expect(result1.workflowId).toBe(result2.workflowId);
    });

    it("throws when session not found", async () => {
      dbMocks.findContextSession.mockReturnValue(Promise.resolve(null));

      await expect(manager.commit(SESSION_ID)).rejects.toThrow(
        `Session not found: ${SESSION_ID}`
      );
    });

    it("throws when session is not active", async () => {
      dbMocks.findContextSession.mockReturnValue(
        Promise.resolve({ ...SAMPLE_SESSION, status: "committed" })
      );

      await expect(manager.commit(SESSION_ID)).rejects.toThrow("is not active");
    });
  });

  describe("delete", () => {
    it("calls db contextSession delete", async () => {
      await manager.delete(SESSION_ID);

      const deleteMock = (mockDb as { contextSession: { delete: MockFn } })
        .contextSession.delete;
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
      });
    });
  });

  describe("list", () => {
    it("delegates to listContextSessions", async () => {
      const result = await manager.list(TEAM_ID, USER_ID);

      expect(dbMocks.listContextSessions).toHaveBeenCalledWith(
        mockDb,
        TEAM_ID,
        USER_ID,
        20
      );
      expect(result).toHaveLength(1);
    });

    it("passes custom limit", async () => {
      await manager.list(TEAM_ID, USER_ID, 5);

      expect(dbMocks.listContextSessions).toHaveBeenCalledWith(
        mockDb,
        TEAM_ID,
        USER_ID,
        5
      );
    });
  });
});
