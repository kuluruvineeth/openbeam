import { describe, expect, it } from "bun:test";
import type { SessionMessage } from "@openplane/types/ai";
import {
  progressiveSummarize,
  type SummarizerDeps,
  summarizeMessages,
} from "../summarizer";

function createMessage(
  role: SessionMessage["role"],
  content: string,
  timestamp = Date.now()
): SessionMessage {
  return { role, content, timestamp };
}

function createMockSummarizerDeps(): SummarizerDeps {
  return {
    generateSummary: (prompt: string): Promise<string> => {
      if (prompt.includes("Update the existing summary")) {
        return Promise.resolve("Updated merged summary of old and new content");
      }

      return Promise.resolve(`SUMMARY:
A test conversation about database migrations and deployment.

KEY_FACTS:
- PostgreSQL is the primary database
- Migrations run during deployment

DECISIONS:
- Use Prisma for migrations
- Deploy to staging first

ACTION_ITEMS:
- Write migration script
- Update deployment docs`);
    },
    estimateTokens: (text: string) => Math.ceil(text.length / 4),
  };
}

describe("summarizeMessages", () => {
  const deps = createMockSummarizerDeps();

  it("returns empty result for no messages", async () => {
    const result = await summarizeMessages([], deps);

    expect(result.summary).toBe("");
    expect(result.keyFacts).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.actionItems).toEqual([]);
    expect(result.messagesCovered).toBe(0);
    expect(result.tokensSaved).toBe(0);
  });

  it("summarizes a conversation", async () => {
    const messages = [
      createMessage("user", "How should we handle database migrations?"),
      createMessage("assistant", "I recommend using Prisma for migrations."),
      createMessage("user", "What about deployment strategy?"),
      createMessage("assistant", "Deploy to staging first, then production."),
    ];

    const result = await summarizeMessages(messages, deps);

    expect(result.summary).toContain("database migrations");
    expect(result.messagesCovered).toBe(4);
    expect(result.keyFacts.length).toBeGreaterThan(0);
    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it("extracts key facts", async () => {
    const messages = [
      createMessage("user", "Tell me about the database"),
      createMessage("assistant", "We use PostgreSQL"),
    ];

    const result = await summarizeMessages(messages, deps);

    expect(result.keyFacts).toContain("PostgreSQL is the primary database");
    expect(result.keyFacts).toContain("Migrations run during deployment");
  });

  it("extracts decisions", async () => {
    const messages = [
      createMessage("user", "What migration tool should we use?"),
      createMessage("assistant", "Use Prisma"),
    ];

    const result = await summarizeMessages(messages, deps);

    expect(result.decisions).toContain("Use Prisma for migrations");
    expect(result.decisions).toContain("Deploy to staging first");
  });

  it("extracts action items", async () => {
    const messages = [
      createMessage("user", "What needs to be done?"),
      createMessage("assistant", "Write scripts and update docs"),
    ];

    const result = await summarizeMessages(messages, deps);

    expect(result.actionItems).toContain("Write migration script");
    expect(result.actionItems).toContain("Update deployment docs");
  });

  it("calculates token savings", async () => {
    const longContent = "A".repeat(2000);
    const messages = [
      createMessage("user", longContent),
      createMessage("assistant", longContent),
    ];

    const result = await summarizeMessages(messages, deps);

    expect(result.tokensSaved).toBeGreaterThan(0);
  });
});

describe("progressiveSummarize", () => {
  const deps = createMockSummarizerDeps();

  it("falls back to regular summarize for small conversations", async () => {
    const messages = [
      createMessage("user", "Quick question"),
      createMessage("assistant", "Quick answer"),
    ];

    const result = await progressiveSummarize(messages, null, deps);

    expect(result.summary).toBeDefined();
    expect(result.messagesCovered).toBe(2);
  });

  it("handles progressive summarization with existing summary", async () => {
    const messages = [
      createMessage("user", "Follow-up question"),
      createMessage("assistant", "Follow-up answer"),
    ];

    const result = await progressiveSummarize(
      messages,
      "Previous discussion about auth system",
      deps,
      { maxMessagesPerSummary: 1 }
    );

    expect(result.summary).toBeDefined();
    expect(result.messagesCovered).toBe(2);
  });

  it("splits large conversations into older and recent", async () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      createMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`)
    );

    const result = await progressiveSummarize(messages, null, deps, {
      maxMessagesPerSummary: 5,
    });

    expect(result.messagesCovered).toBe(20);
    expect(result.summary).toBeDefined();
  });

  it("calculates token savings for progressive summarization", async () => {
    const longContent = "B".repeat(1000);
    const messages = Array.from({ length: 10 }, (_, i) =>
      createMessage(i % 2 === 0 ? "user" : "assistant", `${longContent} ${i}`)
    );

    const result = await progressiveSummarize(messages, null, deps, {
      maxMessagesPerSummary: 3,
    });

    expect(result.tokensSaved).toBeGreaterThan(0);
  });
});

describe("summarization response parsing", () => {
  it("handles NONE sections gracefully", async () => {
    const deps: SummarizerDeps = {
      generateSummary: async () =>
        `SUMMARY:
Short conversation with no decisions.

KEY_FACTS:
- One fact

DECISIONS:
NONE

ACTION_ITEMS:
NONE`,
      estimateTokens: (text) => Math.ceil(text.length / 4),
    };

    const result = await summarizeMessages(
      [createMessage("user", "Hello")],
      deps
    );

    expect(result.keyFacts).toEqual(["One fact"]);
    expect(result.decisions).toEqual([]);
    expect(result.actionItems).toEqual([]);
  });

  it("handles malformed response by using raw text as summary", async () => {
    const deps: SummarizerDeps = {
      generateSummary: async () => "Just a plain text response without format",
      estimateTokens: (text) => Math.ceil(text.length / 4),
    };

    const result = await summarizeMessages(
      [createMessage("user", "Hello")],
      deps
    );

    expect(result.summary).toBe("Just a plain text response without format");
    expect(result.keyFacts).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.actionItems).toEqual([]);
  });
});
