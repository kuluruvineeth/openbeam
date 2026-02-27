import { afterEach, describe, expect, it, mock } from "bun:test";
import type { SessionMemoryStore } from "../../../../memory/session";
import type { SummarizerDeps } from "../../../../memory/summarizer";
import type { ToolContext } from "../../../types";
import {
  memorySummarizeTool,
  setSessionMemoryForSummarize,
  setSummarizerDeps,
} from "../summarize";

function createMockSessionMemory(
  overrides?: Partial<SessionMemoryStore>
): SessionMemoryStore {
  return {
    append: mock(() => Promise.resolve()),
    getMessages: mock(() => Promise.resolve([])),
    getAll: mock(() => Promise.resolve(null)),
    clear: mock(() => Promise.resolve()),
    truncate: mock(() => Promise.resolve(0)),
    setSummary: mock(() => Promise.resolve()),
    getSummary: mock(() => Promise.resolve(null)),
    messageCount: mock(() => Promise.resolve(0)),
    ...overrides,
  };
}

function createMockSummarizerDeps(
  overrides?: Partial<SummarizerDeps>
): SummarizerDeps {
  return {
    generateSummary: mock(() =>
      Promise.resolve(
        [
          "## Summary",
          "Test conversation summary.",
          "",
          "## Key Facts",
          "- Fact one",
          "",
          "## Decisions",
          "- Decision one",
          "",
          "## Action Items",
          "- Action one",
        ].join("\n")
      )
    ),
    ...overrides,
  };
}

function createTestContext(): ToolContext {
  return {
    teamId: "team_abc",
    userId: "user_123",
    services: {} as never,
  };
}

describe("memorySummarizeTool", () => {
  afterEach(() => {
    setSessionMemoryForSummarize(null as unknown as SessionMemoryStore);
    setSummarizerDeps(null as unknown as SummarizerDeps);
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(memorySummarizeTool.metadata.name).toBe("memory_summarize");
    });

    it("has data category", () => {
      expect(memorySummarizeTool.metadata.category).toBe("data");
    });

    it("requires memory:read and session:read permissions", () => {
      const perms = memorySummarizeTool.metadata.requiredPermissions;
      expect(perms).toContain("memory:read");
      expect(perms).toContain("session:read");
    });

    it("includes search keywords", () => {
      const keywords = memorySummarizeTool.metadata.searchKeywords;
      expect(keywords).toContain("summarize");
      expect(keywords).toContain("summary");
      expect(keywords).toContain("recap");
    });
  });

  describe("execute", () => {
    it("fails when session memory is not initialized", async () => {
      const result = await memorySummarizeTool.execute(
        { storeSummary: false },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });

    it("fails when summarizer deps are not configured", async () => {
      const mockSession = createMockSessionMemory();
      setSessionMemoryForSummarize(mockSession);

      const result = await memorySummarizeTool.execute(
        { storeSummary: false },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });

    it("returns empty summary when no messages", async () => {
      const mockSession = createMockSessionMemory({
        getMessages: mock(() => Promise.resolve([])),
      });
      setSessionMemoryForSummarize(mockSession);
      setSummarizerDeps(createMockSummarizerDeps());

      const result = await memorySummarizeTool.execute(
        { storeSummary: false },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        summary: string;
        messagesCovered: number;
        tokensSaved: number;
      };
      expect(data.summary).toBe("");
      expect(data.messagesCovered).toBe(0);
      expect(data.tokensSaved).toBe(0);
    });

    it("passes messageLimit to getMessages", async () => {
      const mockSession = createMockSessionMemory();
      setSessionMemoryForSummarize(mockSession);
      setSummarizerDeps(createMockSummarizerDeps());

      await memorySummarizeTool.execute(
        { messageLimit: 25, storeSummary: false },
        createTestContext()
      );

      expect(mockSession.getMessages).toHaveBeenCalledWith(25);
    });

    it("calls summarizeMessages with session messages", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "What is our deployment strategy?",
          timestamp: 1_700_000_000_000,
        },
        {
          role: "assistant" as const,
          content: "We use Kubernetes for deployments.",
          timestamp: 1_700_000_001_000,
        },
      ];
      const mockSession = createMockSessionMemory({
        getMessages: mock(() => Promise.resolve(messages)),
      });
      const mockDeps = createMockSummarizerDeps();
      setSessionMemoryForSummarize(mockSession);
      setSummarizerDeps(mockDeps);

      const result = await memorySummarizeTool.execute(
        { storeSummary: false },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(mockDeps.generateSummary).toHaveBeenCalled();
    });

    it("stores summary when storeSummary is true", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "Hello",
          timestamp: 1_700_000_000_000,
        },
      ];
      const mockSession = createMockSessionMemory({
        getMessages: mock(() => Promise.resolve(messages)),
      });
      setSessionMemoryForSummarize(mockSession);
      setSummarizerDeps(createMockSummarizerDeps());

      await memorySummarizeTool.execute(
        { storeSummary: true },
        createTestContext()
      );

      expect(mockSession.setSummary).toHaveBeenCalled();
    });

    it("does not store summary when storeSummary is false", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "Hello",
          timestamp: 1_700_000_000_000,
        },
      ];
      const mockSession = createMockSessionMemory({
        getMessages: mock(() => Promise.resolve(messages)),
      });
      setSessionMemoryForSummarize(mockSession);
      setSummarizerDeps(createMockSummarizerDeps());

      await memorySummarizeTool.execute(
        { storeSummary: false },
        createTestContext()
      );

      expect(mockSession.setSummary).not.toHaveBeenCalled();
    });
  });
});
