import { beforeEach, describe, expect, it } from "bun:test";
import type { MCPServerContext } from "@openplane/types/ai";
import {
  buildAnalysisPromptMessages,
  buildAnswerPromptMessages,
  buildConnectorExplanationMessages,
  buildExpertFinderMessages,
  buildSearchPromptMessages,
  buildSummaryPromptMessages,
  createAssistantMessage,
  createPromptRegistry,
  createTextContent,
  createUserMessage,
  defineAnalyzeDocumentsPrompt,
  defineAnswerQuestionPrompt,
  defineDocumentSummaryPrompt,
  defineEnterpriseSearchPrompt,
  defineExplainConnectorPrompt,
  defineFindExpertPrompt,
  getDefaultPromptDefinitions,
  PromptRegistry,
  registerDefaultPrompts,
} from "../prompts";

function createTestContext(
  overrides?: Partial<MCPServerContext>
): MCPServerContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    sessionId: "session_test",
    ...overrides,
  };
}

describe("PromptRegistry", () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  describe("register and list", () => {
    it("registers prompts", () => {
      const definition = defineEnterpriseSearchPrompt();
      const handler = async () => ({ messages: [] });

      registry.register(definition, handler);

      const prompts = registry.list();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]?.name).toBe("enterprise-search");
    });

    it("lists multiple registered prompts", () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));
      registry.register(defineDocumentSummaryPrompt(), async () => ({
        messages: [],
      }));
      registry.register(defineAnswerQuestionPrompt(), async () => ({
        messages: [],
      }));

      const prompts = registry.list();
      expect(prompts).toHaveLength(3);
    });

    it("includes full prompt definition in list", () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));

      const [prompt] = registry.list();
      expect(prompt).toMatchObject({
        name: "enterprise-search",
        description:
          "Search across all connected enterprise data sources with optional filters",
        arguments: expect.arrayContaining([
          expect.objectContaining({ name: "query", required: true }),
        ]),
      });
    });
  });

  describe("has", () => {
    it("returns true for registered prompt", () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));
      expect(registry.has("enterprise-search")).toBe(true);
    });

    it("returns false for unregistered prompt", () => {
      expect(registry.has("unknown-prompt")).toBe(false);
    });
  });

  describe("get", () => {
    it("executes registered prompt handler", async () => {
      const expectedMessages = [createUserMessage("Test message")];
      const handler = async () => ({ messages: expectedMessages });

      registry.register(defineEnterpriseSearchPrompt(), handler);

      const result = await registry.get(
        "enterprise-search",
        { query: "test" },
        createTestContext()
      );
      expect(result?.messages).toEqual(expectedMessages);
    });

    it("returns null for unregistered prompt", async () => {
      const result = await registry.get("unknown", {}, createTestContext());
      expect(result).toBeNull();
    });

    it("passes arguments to handler", async () => {
      let receivedArgs: Record<string, string> = {};
      const handler = (args: Record<string, string>) => {
        receivedArgs = args;
        return Promise.resolve({ messages: [] });
      };

      registry.register(defineEnterpriseSearchPrompt(), handler);

      await registry.get(
        "enterprise-search",
        { query: "test query", sources: "slack,notion" },
        createTestContext()
      );

      expect(receivedArgs.query).toBe("test query");
      expect(receivedArgs.sources).toBe("slack,notion");
    });

    it("passes context to handler", async () => {
      let receivedContext: MCPServerContext | null = null;
      const handler = (
        _args: Record<string, string>,
        ctx: MCPServerContext
      ) => {
        receivedContext = ctx;
        return Promise.resolve({ messages: [] });
      };

      registry.register(defineEnterpriseSearchPrompt(), handler);

      const context = createTestContext({ teamId: "specific_team" });
      await registry.get("enterprise-search", { query: "test" }, context);

      expect(receivedContext).toMatchObject({ teamId: "specific_team" });
    });

    it("default prompts include execution context in messages", async () => {
      registerDefaultPrompts(registry);

      const result = await registry.get(
        "enterprise-search",
        { query: "test" },
        createTestContext({ teamId: "team_scoped" })
      );

      const contentText = (result?.messages[0]?.content as { text: string })
        .text;
      expect(contentText).toContain("teamId=team_scoped");
    });
  });

  describe("argument validation", () => {
    it("rejects missing required arguments", async () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));

      await expect(
        registry.get("enterprise-search", {}, createTestContext())
      ).rejects.toThrow("Missing required argument: query");
    });

    it("accepts optional arguments being absent", async () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));

      const result = await registry.get(
        "enterprise-search",
        { query: "test" },
        createTestContext()
      );
      expect(result).toBeDefined();
    });

    it("validates multiple required arguments", async () => {
      const definition = {
        name: "multi-required",
        description: "Prompt with multiple required args",
        arguments: [
          { name: "arg1", description: "First", required: true },
          { name: "arg2", description: "Second", required: true },
        ],
      };

      registry.register(definition, async () => ({ messages: [] }));

      await expect(
        registry.get("multi-required", { arg1: "value" }, createTestContext())
      ).rejects.toThrow("Missing required argument: arg2");
    });

    it("passes validation when all required args provided", async () => {
      const definition = {
        name: "multi-required",
        description: "Prompt with multiple required args",
        arguments: [
          { name: "arg1", description: "First", required: true },
          { name: "arg2", description: "Second", required: true },
        ],
      };

      registry.register(definition, async () => ({ messages: [] }));

      const result = await registry.get(
        "multi-required",
        { arg1: "v1", arg2: "v2" },
        createTestContext()
      );
      expect(result).toBeDefined();
    });

    it("handles prompts with no arguments", async () => {
      const definition = {
        name: "no-args",
        description: "Prompt without arguments",
      };

      registry.register(definition, async () => ({ messages: [] }));

      const result = await registry.get("no-args", {}, createTestContext());
      expect(result).toBeDefined();
    });
  });

  describe("clear", () => {
    it("removes all registered prompts", () => {
      registry.register(defineEnterpriseSearchPrompt(), async () => ({
        messages: [],
      }));
      registry.register(defineDocumentSummaryPrompt(), async () => ({
        messages: [],
      }));

      registry.clear();

      expect(registry.list()).toHaveLength(0);
      expect(registry.has("enterprise-search")).toBe(false);
    });
  });
});

describe("Message Helpers", () => {
  describe("createTextContent", () => {
    it("creates text content", () => {
      const content = createTextContent("Hello");
      expect(content).toEqual({ type: "text", text: "Hello" });
    });
  });

  describe("createUserMessage", () => {
    it("creates user message with text content", () => {
      const message = createUserMessage("User query");
      expect(message.role).toBe("user");
      expect(message.content).toEqual({ type: "text", text: "User query" });
    });
  });

  describe("createAssistantMessage", () => {
    it("creates assistant message with text content", () => {
      const message = createAssistantMessage("Assistant response");
      expect(message.role).toBe("assistant");
      expect(message.content).toEqual({
        type: "text",
        text: "Assistant response",
      });
    });
  });
});

describe("Prompt Definition Factories", () => {
  it("defineEnterpriseSearchPrompt creates valid definition", () => {
    const def = defineEnterpriseSearchPrompt();
    expect(def.name).toBe("enterprise-search");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "query", required: true })
    );
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "sources", required: false })
    );
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "limit", required: false })
    );
  });

  it("defineDocumentSummaryPrompt creates valid definition", () => {
    const def = defineDocumentSummaryPrompt();
    expect(def.name).toBe("document-summary");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "documentId", required: true })
    );
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "length", required: false })
    );
  });

  it("defineAnswerQuestionPrompt creates valid definition", () => {
    const def = defineAnswerQuestionPrompt();
    expect(def.name).toBe("answer-question");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "question", required: true })
    );
  });

  it("defineAnalyzeDocumentsPrompt creates valid definition", () => {
    const def = defineAnalyzeDocumentsPrompt();
    expect(def.name).toBe("analyze-documents");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "documentIds", required: true })
    );
  });

  it("defineExplainConnectorPrompt creates valid definition", () => {
    const def = defineExplainConnectorPrompt();
    expect(def.name).toBe("explain-connector");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "connectorType", required: true })
    );
  });

  it("defineFindExpertPrompt creates valid definition", () => {
    const def = defineFindExpertPrompt();
    expect(def.name).toBe("find-expert");
    expect(def.arguments).toContainEqual(
      expect.objectContaining({ name: "topic", required: true })
    );
  });
});

describe("getDefaultPromptDefinitions", () => {
  it("returns all default prompt definitions", () => {
    const definitions = getDefaultPromptDefinitions();
    expect(definitions).toHaveLength(6);

    const names = definitions.map((d) => d.name);
    expect(names).toContain("enterprise-search");
    expect(names).toContain("document-summary");
    expect(names).toContain("answer-question");
    expect(names).toContain("analyze-documents");
    expect(names).toContain("explain-connector");
    expect(names).toContain("find-expert");
  });
});

describe("Prompt Message Builders", () => {
  describe("buildSearchPromptMessages", () => {
    it("builds basic search message", () => {
      const messages = buildSearchPromptMessages({ query: "test query" });
      expect(messages).toHaveLength(1);
      expect(messages[0]?.role).toBe("user");
      expect((messages[0]?.content as { text: string }).text).toContain(
        "test query"
      );
    });

    it("includes source filter when provided", () => {
      const messages = buildSearchPromptMessages({
        query: "test",
        sources: "slack,notion",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("slack,notion");
    });

    it("includes limit when provided", () => {
      const messages = buildSearchPromptMessages({
        query: "test",
        limit: "20",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("20");
    });
  });

  describe("buildSummaryPromptMessages", () => {
    it("builds basic summary message", () => {
      const messages = buildSummaryPromptMessages({ documentId: "doc_123" });
      expect(messages).toHaveLength(1);
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("doc_123");
    });

    it("uses brief length instruction", () => {
      const messages = buildSummaryPromptMessages({
        documentId: "doc_1",
        length: "brief",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("2-3 sentence");
    });

    it("uses detailed length instruction", () => {
      const messages = buildSummaryPromptMessages({
        documentId: "doc_1",
        length: "detailed",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("multi-paragraph");
    });

    it("defaults to standard length", () => {
      const messages = buildSummaryPromptMessages({ documentId: "doc_1" });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("comprehensive paragraph");
    });
  });

  describe("buildAnswerPromptMessages", () => {
    it("builds basic answer message", () => {
      const messages = buildAnswerPromptMessages({ question: "What is X?" });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("What is X?");
    });

    it("includes context when provided", () => {
      const messages = buildAnswerPromptMessages({
        question: "What is X?",
        context: "Additional info",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("Additional info");
    });
  });

  describe("buildAnalysisPromptMessages", () => {
    it("builds analysis message with document IDs", () => {
      const messages = buildAnalysisPromptMessages({
        documentIds: "doc_1,doc_2",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("doc_1,doc_2");
    });

    it("uses themes analysis by default", () => {
      const messages = buildAnalysisPromptMessages({ documentIds: "doc_1" });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("themes");
    });

    it("uses entities analysis type", () => {
      const messages = buildAnalysisPromptMessages({
        documentIds: "doc_1",
        analysisType: "entities",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("entities");
    });

    it("uses timeline analysis type", () => {
      const messages = buildAnalysisPromptMessages({
        documentIds: "doc_1",
        analysisType: "timeline",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("timeline");
    });

    it("uses comparison analysis type", () => {
      const messages = buildAnalysisPromptMessages({
        documentIds: "doc_1",
        analysisType: "comparison",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("Compare and contrast");
    });
  });

  describe("buildConnectorExplanationMessages", () => {
    it("builds connector explanation message", () => {
      const messages = buildConnectorExplanationMessages({
        connectorType: "slack",
      });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("slack");
      expect(text).toContain("connector");
    });
  });

  describe("buildExpertFinderMessages", () => {
    it("builds expert finder message", () => {
      const messages = buildExpertFinderMessages({ topic: "machine learning" });
      const text = (messages[0]?.content as { text: string }).text;
      expect(text).toContain("machine learning");
      expect(text).toContain("expertise");
    });
  });
});

describe("createPromptRegistry", () => {
  it("creates new empty registry", () => {
    const registry = createPromptRegistry();
    expect(registry.list()).toHaveLength(0);
  });
});
