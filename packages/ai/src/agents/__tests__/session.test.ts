import { beforeEach, describe, expect, it } from "bun:test";
import { type AgentSession, SessionManager } from "../session";

const SESSION_ID_PATTERN = /^session_/;

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager({
      defaultExpirationMs: 1000,
      maxCheckpoints: 5,
    });
  });

  describe("createSession", () => {
    it("creates a session with required fields", () => {
      const session = manager.createSession("team-1", "user-1");

      expect(session.id).toMatch(SESSION_ID_PATTERN);
      expect(session.teamId).toBe("team-1");
      expect(session.userId).toBe("user-1");
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.state).toBeDefined();
      expect(session.checkpoints).toEqual([]);
    });

    it("creates a session with metadata", () => {
      const session = manager.createSession("team-1", "user-1", {
        source: "api",
        version: "1.0",
      });

      expect(session.metadata).toEqual({ source: "api", version: "1.0" });
    });

    it("calls onSessionCreate callback", () => {
      const sessions: AgentSession[] = [];
      const customManager = new SessionManager({
        onSessionCreate: (s) => sessions.push(s),
      });

      customManager.createSession("team-1", "user-1");

      expect(sessions).toHaveLength(1);
    });
  });

  describe("getSession", () => {
    it("returns session by id", () => {
      const created = manager.createSession("team-1", "user-1");
      const retrieved = manager.getSession(created.id);

      expect(retrieved).toEqual(created);
    });

    it("returns null for non-existent session", () => {
      const result = manager.getSession("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("resumeSession", () => {
    it("updates expiration time on resume", () => {
      const session = manager.createSession("team-1", "user-1");
      const originalExpiry = session.expiresAt;

      const resumed = manager.resumeSession(session.id);

      expect(resumed).not.toBeNull();
      expect(resumed?.expiresAt?.getTime()).toBeGreaterThanOrEqual(
        originalExpiry?.getTime() ?? 0
      );
    });

    it("returns null for expired session", async () => {
      const session = manager.createSession("team-1", "user-1");
      await new Promise((r) => setTimeout(r, 1100));

      const resumed = manager.resumeSession(session.id);

      expect(resumed).toBeNull();
    });
  });

  describe("updateSession", () => {
    it("updates session state", () => {
      const session = manager.createSession("team-1", "user-1");
      const newState = { values: new Map([["key", "value"]]), history: [] };

      const updated = manager.updateSession(session.id, { state: newState });

      expect(updated?.state.values.get("key")).toBe("value");
    });

    it("merges metadata", () => {
      const session = manager.createSession("team-1", "user-1", { a: 1 });

      manager.updateSession(session.id, { metadata: { b: 2 } });

      expect(session.metadata).toEqual({ a: 1, b: 2 });
    });
  });

  describe("checkpoints", () => {
    it("creates checkpoint of current state", () => {
      const session = manager.createSession("team-1", "user-1");
      session.state.values.set("step", 1);

      const checkpoint = manager.createCheckpoint(session.id, "before-change");

      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.label).toBe("before-change");
      expect(checkpoint?.state.values.get("step")).toBe(1);
    });

    it("limits checkpoints to maxCheckpoints", () => {
      const session = manager.createSession("team-1", "user-1");

      for (let i = 0; i < 7; i++) {
        manager.createCheckpoint(session.id, `checkpoint-${i}`);
      }

      const checkpoints = manager.getCheckpoints(session.id);
      expect(checkpoints).toHaveLength(5);
    });

    it("rolls back to checkpoint", () => {
      const session = manager.createSession("team-1", "user-1");
      session.state.values.set("step", 1);

      const checkpoint = manager.createCheckpoint(session.id, "step-1");
      expect(checkpoint).not.toBeNull();
      session.state.values.set("step", 2);

      const rolled = manager.rollback(
        session.id,
        (checkpoint as NonNullable<typeof checkpoint>).id
      );

      expect(rolled?.state.values.get("step")).toBe(1);
    });

    it("removes checkpoints after rolled-back point", () => {
      const session = manager.createSession("team-1", "user-1");

      const cp1 = manager.createCheckpoint(session.id, "cp1");
      expect(cp1).not.toBeNull();
      manager.createCheckpoint(session.id, "cp2");
      manager.createCheckpoint(session.id, "cp3");

      manager.rollback(session.id, (cp1 as NonNullable<typeof cp1>).id);

      const checkpoints = manager.getCheckpoints(session.id);
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]?.label).toBe("cp1");
    });

    it("maintains reference consistency between session.checkpoints and internal checkpoints store", () => {
      const session = manager.createSession("team-1", "user-1");

      const cp1 = manager.createCheckpoint(session.id, "cp1");
      expect(cp1).not.toBeNull();
      manager.createCheckpoint(session.id, "cp2");
      manager.createCheckpoint(session.id, "cp3");

      manager.rollback(session.id, (cp1 as NonNullable<typeof cp1>).id);

      const internalCheckpoints = manager.getCheckpoints(session.id);
      expect(session.checkpoints).toBe(internalCheckpoints);
      expect(session.checkpoints).toHaveLength(1);
    });
  });

  describe("conversation history", () => {
    it("stores conversation turns", () => {
      const session = manager.createSession("team-1", "user-1");

      manager.addConversationTurn(session.id, "user", "Hello");
      manager.addConversationTurn(session.id, "assistant", "Hi there!");

      const history = manager.getConversationHistory(session.id);

      expect(history?.turns).toHaveLength(2);
      expect(history?.turns[0]?.role).toBe("user");
      expect(history?.turns[0]?.content).toBe("Hello");
      expect(history?.turns[1]?.role).toBe("assistant");
    });

    it("updates conversation summary", () => {
      const session = manager.createSession("team-1", "user-1");

      manager.updateConversationSummary(session.id, "User greeted assistant");

      const history = manager.getConversationHistory(session.id);
      expect(history?.summary).toBe("User greeted assistant");
    });

    it("returns false for non-existent session", () => {
      const result = manager.addConversationTurn("nonexistent", "user", "Hi");

      expect(result).toBe(false);
    });
  });

  describe("session expiration", () => {
    it("expires sessions after timeout", async () => {
      manager.createSession("team-1", "user-1");
      await new Promise((r) => setTimeout(r, 1100));

      const sessions = manager.listSessions("team-1");

      expect(sessions).toHaveLength(0);
    });

    it("calls onSessionExpire callback", async () => {
      const expired: AgentSession[] = [];
      const customManager = new SessionManager({
        defaultExpirationMs: 100,
        onSessionExpire: (s) => expired.push(s),
      });

      customManager.createSession("team-1", "user-1");
      await new Promise((r) => setTimeout(r, 150));

      customManager.cleanupExpiredSessions();

      expect(expired).toHaveLength(1);
    });

    it("cleanupExpiredSessions returns count", async () => {
      manager.createSession("team-1", "user-1");
      manager.createSession("team-1", "user-2");
      await new Promise((r) => setTimeout(r, 1100));

      const cleaned = manager.cleanupExpiredSessions();

      expect(cleaned).toBe(2);
    });
  });

  describe("listSessions", () => {
    it("filters by teamId", () => {
      manager.createSession("team-1", "user-1");
      manager.createSession("team-2", "user-1");

      const sessions = manager.listSessions("team-1");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.teamId).toBe("team-1");
    });

    it("filters by userId", () => {
      manager.createSession("team-1", "user-1");
      manager.createSession("team-1", "user-2");

      const sessions = manager.listSessions("team-1", "user-1");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.userId).toBe("user-1");
    });

    it("sorts by updatedAt descending", () => {
      const s1 = manager.createSession("team-1", "user-1");
      const s2 = manager.createSession("team-1", "user-2");

      manager.resumeSession(s1.id);

      const sessions = manager.listSessions("team-1");

      expect(sessions[0]?.id).toBe(s1.id);
      expect(sessions[1]?.id).toBe(s2.id);
    });
  });

  describe("deleteSession", () => {
    it("removes session and related data", () => {
      const session = manager.createSession("team-1", "user-1");
      manager.addConversationTurn(session.id, "user", "Hello");
      manager.createCheckpoint(session.id, "test");

      manager.deleteSession(session.id);

      expect(manager.getSession(session.id)).toBeNull();
      expect(manager.getConversationHistory(session.id)).toBeNull();
      expect(manager.getCheckpoints(session.id)).toEqual([]);
    });
  });
});
