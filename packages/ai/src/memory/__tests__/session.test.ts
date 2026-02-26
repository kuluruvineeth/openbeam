import { beforeEach, describe, expect, it } from "bun:test";
import {
  createSessionMemory,
  type SessionMemoryStore,
  SessionMemoryStoreImpl,
} from "../session";
import { InMemoryShortTermClient } from "../short-term";

describe("SessionMemoryStoreImpl", () => {
  let client: InMemoryShortTermClient;
  let store: SessionMemoryStore;

  beforeEach(() => {
    client = new InMemoryShortTermClient();
    store = new SessionMemoryStoreImpl({
      client,
      teamId: "team-1",
      sessionId: "session-1",
      maxMessages: 5,
      ttlSeconds: 3600,
    });
  });

  describe("append", () => {
    it("adds a message to the session", async () => {
      await store.append("user", "Hello");

      const messages = await store.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]?.role).toBe("user");
      expect(messages[0]?.content).toBe("Hello");
      expect(messages[0]?.timestamp).toBeGreaterThan(0);
    });

    it("appends multiple messages in order", async () => {
      await store.append("user", "First");
      await store.append("assistant", "Second");
      await store.append("user", "Third");

      const messages = await store.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0]?.content).toBe("First");
      expect(messages[1]?.content).toBe("Second");
      expect(messages[2]?.content).toBe("Third");
    });

    it("auto-truncates when exceeding maxMessages", async () => {
      for (let i = 0; i < 7; i++) {
        await store.append("user", `Message ${i}`);
      }

      const messages = await store.getMessages();
      expect(messages).toHaveLength(5);
      expect(messages[0]?.content).toBe("Message 2");
      expect(messages[4]?.content).toBe("Message 6");
    });

    it("includes tool calls when provided", async () => {
      await store.append("assistant", "Using tool", [
        { name: "search", input: { query: "test" } },
      ]);

      const messages = await store.getMessages();
      expect(messages[0]?.toolCalls).toHaveLength(1);
      expect(messages[0]?.toolCalls?.[0]?.name).toBe("search");
    });
  });

  describe("getMessages", () => {
    it("returns all messages without limit", async () => {
      await store.append("user", "One");
      await store.append("assistant", "Two");

      const messages = await store.getMessages();
      expect(messages).toHaveLength(2);
    });

    it("returns limited recent messages", async () => {
      await store.append("user", "One");
      await store.append("assistant", "Two");
      await store.append("user", "Three");

      const messages = await store.getMessages(2);
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("Two");
      expect(messages[1]?.content).toBe("Three");
    });

    it("returns all messages when limit exceeds count", async () => {
      await store.append("user", "One");

      const messages = await store.getMessages(10);
      expect(messages).toHaveLength(1);
    });
  });

  describe("getAll", () => {
    it("returns null for empty session", async () => {
      const result = await store.getAll();
      expect(result).toBeNull();
    });

    it("returns full session data", async () => {
      await store.append("user", "Hello");

      const session = await store.getAll();
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe("session-1");
      expect(session?.teamId).toBe("team-1");
      expect(session?.messages).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("removes all session data", async () => {
      await store.append("user", "Hello");
      await store.setSummary("Test summary");

      await store.clear();

      const session = await store.getAll();
      expect(session).toBeNull();

      const summary = await store.getSummary();
      expect(summary).toBeNull();
    });
  });

  describe("truncate", () => {
    it("keeps the last N messages", async () => {
      for (let i = 0; i < 5; i++) {
        await store.append("user", `Message ${i}`);
      }

      const removed = await store.truncate(2);

      expect(removed).toBe(3);
      const messages = await store.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("Message 3");
      expect(messages[1]?.content).toBe("Message 4");
    });

    it("returns 0 when keepLast exceeds message count", async () => {
      await store.append("user", "One");
      await store.append("user", "Two");

      const removed = await store.truncate(10);

      expect(removed).toBe(0);
      const messages = await store.getMessages();
      expect(messages).toHaveLength(2);
    });
  });

  describe("summary", () => {
    it("stores and retrieves summary", async () => {
      await store.append("user", "Hello");
      await store.setSummary("This is a test summary");

      const summary = await store.getSummary();
      expect(summary).toBe("This is a test summary");
    });

    it("returns null when no summary exists", async () => {
      const summary = await store.getSummary();
      expect(summary).toBeNull();
    });
  });

  describe("messageCount", () => {
    it("returns 0 for empty session", async () => {
      const count = await store.messageCount();
      expect(count).toBe(0);
    });

    it("returns correct count", async () => {
      await store.append("user", "One");
      await store.append("assistant", "Two");
      await store.append("user", "Three");

      const count = await store.messageCount();
      expect(count).toBe(3);
    });
  });
});

describe("createSessionMemory", () => {
  it("creates a session memory store", () => {
    const client = new InMemoryShortTermClient();
    const store = createSessionMemory({
      client,
      teamId: "team-1",
      sessionId: "session-1",
    });
    expect(store).toBeInstanceOf(SessionMemoryStoreImpl);
  });
});

describe("session isolation", () => {
  it("isolates sessions by sessionId", async () => {
    const client = new InMemoryShortTermClient();

    const session1 = createSessionMemory({
      client,
      teamId: "team-1",
      sessionId: "session-1",
    });

    const session2 = createSessionMemory({
      client,
      teamId: "team-1",
      sessionId: "session-2",
    });

    await session1.append("user", "Hello from session 1");
    await session2.append("user", "Hello from session 2");

    const messages1 = await session1.getMessages();
    const messages2 = await session2.getMessages();

    expect(messages1).toHaveLength(1);
    expect(messages1[0]?.content).toBe("Hello from session 1");

    expect(messages2).toHaveLength(1);
    expect(messages2[0]?.content).toBe("Hello from session 2");
  });

  it("isolates sessions by teamId", async () => {
    const client = new InMemoryShortTermClient();

    const teamA = createSessionMemory({
      client,
      teamId: "team-a",
      sessionId: "shared-session",
    });

    const teamB = createSessionMemory({
      client,
      teamId: "team-b",
      sessionId: "shared-session",
    });

    await teamA.append("user", "Team A message");
    await teamB.append("user", "Team B message");

    const messagesA = await teamA.getMessages();
    const messagesB = await teamB.getMessages();

    expect(messagesA).toHaveLength(1);
    expect(messagesA[0]?.content).toBe("Team A message");

    expect(messagesB).toHaveLength(1);
    expect(messagesB[0]?.content).toBe("Team B message");
  });
});
