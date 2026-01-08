import { beforeEach, describe, expect, it } from "bun:test";
import {
  ConversationManager,
  createConversationManager,
  InMemoryConversationStore,
} from "../conversation";

describe("ConversationManager", () => {
  let manager: ConversationManager;
  let store: InMemoryConversationStore;

  beforeEach(() => {
    store = new InMemoryConversationStore();
    manager = new ConversationManager(store, {
      maxMessages: 10,
      maxTokens: 1000,
      summaryThreshold: 500,
    });
  });

  describe("createConversation", () => {
    it("creates a new conversation", async () => {
      const conv = await manager.createConversation("team-1", "user-1");

      expect(conv.id).toBeDefined();
      expect(conv.teamId).toBe("team-1");
      expect(conv.userId).toBe("user-1");
      expect(conv.messages).toHaveLength(0);
      expect(conv.summary).toBeNull();
    });

    it("includes metadata", async () => {
      const conv = await manager.createConversation("team-1", "user-1", {
        source: "web",
      });

      expect(conv.metadata?.source).toBe("web");
    });
  });

  describe("addMessage", () => {
    it("adds message to conversation", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      const msg = await manager.addMessage(conv.id, "user", "Hello");

      expect(msg.id).toBeDefined();
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello");
      expect(msg.timestamp).toBeDefined();
    });

    it("persists message", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv.id, "user", "Hello");
      await manager.addMessage(conv.id, "assistant", "Hi there!");

      const messages = await manager.getMessages(conv.id);
      expect(messages).toHaveLength(2);
    });

    it("throws for non-existent conversation", async () => {
      await expect(
        manager.addMessage("non-existent", "user", "Hello")
      ).rejects.toThrow();
    });
  });

  describe("getMessages", () => {
    it("returns all messages", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv.id, "user", "One");
      await manager.addMessage(conv.id, "assistant", "Two");
      await manager.addMessage(conv.id, "user", "Three");

      const messages = await manager.getMessages(conv.id);
      expect(messages).toHaveLength(3);
    });

    it("returns limited messages", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv.id, "user", "One");
      await manager.addMessage(conv.id, "assistant", "Two");
      await manager.addMessage(conv.id, "user", "Three");

      const messages = await manager.getMessages(conv.id, 2);
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("Two");
      expect(messages[1]?.content).toBe("Three");
    });

    it("returns empty for non-existent conversation", async () => {
      const messages = await manager.getMessages("non-existent");
      expect(messages).toHaveLength(0);
    });
  });

  describe("shouldCompact", () => {
    it("returns false for small conversations", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv.id, "user", "Short");

      const stored = await manager.getConversation(conv.id);
      expect(stored).not.toBeNull();
      expect(manager.shouldCompact(stored as NonNullable<typeof stored>)).toBe(
        false
      );
    });

    it("returns true when exceeding token threshold", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      const longText = "A".repeat(2500);
      await manager.addMessage(conv.id, "user", longText);

      const stored = await manager.getConversation(conv.id);
      expect(stored).not.toBeNull();
      expect(manager.shouldCompact(stored as NonNullable<typeof stored>)).toBe(
        true
      );
    });
  });

  describe("compactHistory", () => {
    it("reduces message count", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      for (let i = 0; i < 10; i++) {
        await manager.addMessage(conv.id, "user", `Message ${i}`);
      }

      const result = await manager.compactHistory(conv.id);

      expect(result.originalMessageCount).toBe(10);
      expect(result.compactedMessageCount).toBeLessThan(10);
      expect(result.compactedMessageCount).toBe(5);
    });

    it("generates summary when summarize function provided", async () => {
      const managerWithSummary = new ConversationManager(store, {
        maxMessages: 10,
        maxTokens: 1000,
        summaryThreshold: 500,
        summarize: async (messages) => `Summary of ${messages.length} messages`,
      });

      const conv = await managerWithSummary.createConversation(
        "team-1",
        "user-1"
      );
      for (let i = 0; i < 10; i++) {
        await managerWithSummary.addMessage(conv.id, "user", `Message ${i}`);
      }

      const result = await managerWithSummary.compactHistory(conv.id);

      expect(result.summaryGenerated).toBe(true);
      const summary = await managerWithSummary.getSummary(conv.id);
      expect(summary).toContain("Summary of");
    });

    it("throws for non-existent conversation", async () => {
      await expect(manager.compactHistory("non-existent")).rejects.toThrow();
    });
  });

  describe("maybeCompactHistory", () => {
    it("returns null when no compaction needed", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv.id, "user", "Short message");

      const result = await manager.maybeCompactHistory(conv.id);
      expect(result).toBeNull();
    });

    it("compacts when threshold exceeded", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      for (let i = 0; i < 10; i++) {
        await manager.addMessage(conv.id, "user", "A".repeat(250));
      }

      const result = await manager.maybeCompactHistory(conv.id);
      expect(result).not.toBeNull();
      expect(result?.compactedMessageCount).toBeLessThan(
        result?.originalMessageCount || 0
      );
    });
  });

  describe("searchConversations", () => {
    it("finds matching messages", async () => {
      const conv1 = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv1.id, "user", "Hello OAuth authentication");

      const conv2 = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv2.id, "user", "Database migration");

      const results = await manager.searchConversations("team-1", "OAuth");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.content).toContain("OAuth");
    });

    it("only searches within team", async () => {
      const conv1 = await manager.createConversation("team-1", "user-1");
      await manager.addMessage(conv1.id, "user", "OAuth in team 1");

      const conv2 = await manager.createConversation("team-2", "user-1");
      await manager.addMessage(conv2.id, "user", "OAuth in team 2");

      const results = await manager.searchConversations("team-1", "OAuth");

      expect(results).toHaveLength(1);
      expect(results[0]?.conversationId).toBe(conv1.id);
    });
  });

  describe("getContextForPrompt", () => {
    it("returns summary and recent messages", async () => {
      const managerWithSummary = new ConversationManager(store, {
        summarize: async () => "Previous discussion summary",
      });

      const conv = await managerWithSummary.createConversation(
        "team-1",
        "user-1"
      );
      for (let i = 0; i < 5; i++) {
        await managerWithSummary.addMessage(conv.id, "user", `Message ${i}`);
      }
      await managerWithSummary.compactHistory(conv.id);
      await managerWithSummary.addMessage(conv.id, "user", "Latest message");

      const context = await managerWithSummary.getContextForPrompt(conv.id);

      expect(context.summary).toBe("Previous discussion summary");
      expect(context.messages.length).toBeGreaterThan(0);
    });

    it("respects token limit", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      for (let i = 0; i < 20; i++) {
        await manager.addMessage(conv.id, "user", "A".repeat(100));
      }

      const context = await manager.getContextForPrompt(conv.id, 500);

      const totalTokens = manager.calculateTokenCount(context.messages);
      expect(totalTokens).toBeLessThanOrEqual(500);
    });
  });

  describe("deleteConversation", () => {
    it("removes conversation", async () => {
      const conv = await manager.createConversation("team-1", "user-1");
      await manager.deleteConversation(conv.id);

      const result = await manager.getConversation(conv.id);
      expect(result).toBeNull();
    });
  });
});

describe("createConversationManager", () => {
  it("creates with default store", () => {
    const manager = createConversationManager();
    expect(manager).toBeInstanceOf(ConversationManager);
  });

  it("creates with custom options", () => {
    const manager = createConversationManager(undefined, {
      maxMessages: 50,
    });
    expect(manager).toBeInstanceOf(ConversationManager);
  });
});

describe("InMemoryConversationStore", () => {
  let store: InMemoryConversationStore;

  beforeEach(() => {
    store = new InMemoryConversationStore();
  });

  it("stores and retrieves conversations", async () => {
    const conv = {
      id: "test-1",
      teamId: "team-1",
      userId: "user-1",
      messages: [],
      summary: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await store.save(conv);
    const retrieved = await store.get("test-1");

    expect(retrieved?.id).toBe("test-1");
  });

  it("deletes conversations", async () => {
    const conv = {
      id: "test-1",
      teamId: "team-1",
      userId: "user-1",
      messages: [],
      summary: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await store.save(conv);
    await store.delete("test-1");
    const retrieved = await store.get("test-1");

    expect(retrieved).toBeNull();
  });

  it("clears all conversations", async () => {
    await store.save({
      id: "test-1",
      teamId: "team-1",
      userId: "user-1",
      messages: [],
      summary: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    store.clear();
    const retrieved = await store.get("test-1");

    expect(retrieved).toBeNull();
  });
});
