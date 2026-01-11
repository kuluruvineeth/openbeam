import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { MemoryConsolidator } from "../../memory/consolidator";
import type { AgentExecutionContext, AgentState } from "../config";
import {
  type AgentContextData,
  type AgentMemoryConfig,
  buildAgentSystemPrompt,
  createAgentMemoryManager,
  createMemoryCallbacks,
  extractContextMdFromState,
  injectMemoryIntoState,
  loadAgentMemory,
  withAgentMemory,
} from "../memory";

const SESSION_ID_PATTERN = /^session_/;

function createMockMemoryConsolidator(): MemoryConsolidator {
  return {
    consolidate: mock(() =>
      Promise.resolve({
        episodic: "Recent conversation about project planning",
        semantic: "User prefers concise answers",
        procedural: "Learned to use search_hybrid first",
        tokenCount: 500,
        entryCount: 10,
      })
    ),
    storeConversationTurn: mock(() => Promise.resolve()),
    storeToolCall: mock(() => Promise.resolve()),
    learnFact: mock(() => Promise.resolve("fact_123")),
    learnProcedure: mock(() => Promise.resolve("proc_456")),
    recordProcedureOutcome: mock(() => Promise.resolve()),
    suggestAction: mock(() =>
      Promise.resolve({ action: "search_hybrid", confidence: 0.85 })
    ),
    getRelevantKnowledge: mock(() =>
      Promise.resolve([
        { content: "Fact 1", category: "general", confidence: 0.9 },
      ])
    ),
    getStats: mock(() =>
      Promise.resolve({
        episodic: 100,
        semantic: 50,
        procedural: 20,
        total: 170,
      })
    ),
  } as unknown as MemoryConsolidator;
}

function createTestState(): AgentState {
  return {
    values: new Map(),
    history: [],
  };
}

function createTestContext(
  overrides: Partial<AgentExecutionContext> = {}
): AgentExecutionContext {
  return {
    teamId: "team_123",
    userId: "user_456",
    sessionId: "session_789",
    state: createTestState(),
    ...overrides,
  };
}

function createTestContextData(
  overrides: Partial<AgentContextData> = {}
): AgentContextData {
  return {
    teamId: "team_123",
    userId: "user_456",
    teamName: "Engineering",
    userName: "John",
    agentRole: "Research Assistant",
    ...overrides,
  };
}

describe("loadAgentMemory", () => {
  let mockMemory: MemoryConsolidator;

  beforeEach(() => {
    mockMemory = createMockMemoryConsolidator();
  });

  it("loads memory with default config", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData();

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("context.md");
    expect(result.episodic).toBe("Recent conversation about project planning");
    expect(result.semantic).toBe("User prefers concise answers");
    expect(result.procedural).toBe("Learned to use search_hybrid first");
    expect(result.tokenCount).toBe(500);
    expect(result.entryCount).toBe(10);
  });

  it("includes team name in context", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData({ teamName: "Product Team" });

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("Product Team");
  });

  it("includes agent role when provided", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData({ agentRole: "Code Reviewer" });

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("Code Reviewer");
  });

  it("calls consolidate with correct parameters", async () => {
    const config: AgentMemoryConfig = {
      memory: mockMemory,
      includeEpisodic: true,
      includeSemantic: false,
      includeProcedural: true,
    };
    const ctx = createTestContext();
    const contextData = createTestContextData();

    await loadAgentMemory(config, ctx, contextData);

    expect(mockMemory.consolidate).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team_123",
        userId: "user_456",
        sessionId: "session_789",
        types: ["episodic", "procedural"],
      })
    );
  });

  it("includes preferences when provided", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData({
      preferences: { responseStyle: "detailed", timezone: "America/New_York" },
    });

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("detailed");
  });

  it("includes connected resources when provided", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData({
      connectedResources: [
        {
          type: "slack",
          name: "Slack",
          documentCount: 1500,
          lastSyncAt: "2024-01-15T10:00:00Z",
          status: "active",
        },
      ],
    });

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("Slack");
  });

  it("includes session state when provided", async () => {
    const config: AgentMemoryConfig = { memory: mockMemory };
    const ctx = createTestContext();
    const contextData = createTestContextData({
      sessionState: { turnCount: 5, activeConversationTopic: "Bug triage" },
    });

    const result = await loadAgentMemory(config, ctx, contextData);

    expect(result.contextMd).toContain("Turn 5");
  });
});

describe("buildAgentSystemPrompt", () => {
  it("builds prompt with context only", () => {
    const result = buildAgentSystemPrompt({
      contextMd: "# context.md\nTeam: Engineering",
    });

    expect(result).toContain("<context>");
    expect(result).toContain("Team: Engineering");
    expect(result).toContain("</context>");
  });

  it("includes base prompt when provided", () => {
    const result = buildAgentSystemPrompt({
      basePrompt: "You are a helpful assistant.",
      contextMd: "# context.md",
    });

    expect(result).toContain("You are a helpful assistant.");
    expect(result).toContain("<context>");
  });

  it("includes tool context when provided", () => {
    const result = buildAgentSystemPrompt({
      contextMd: "# context.md",
      toolContext: "Available tools: search_hybrid, doc_get",
    });

    expect(result).toContain("<available_tools>");
    expect(result).toContain("search_hybrid");
    expect(result).toContain("</available_tools>");
  });

  it("includes additional instructions when provided", () => {
    const result = buildAgentSystemPrompt({
      contextMd: "# context.md",
      additionalInstructions: ["Always cite sources", "Be concise"],
    });

    expect(result).toContain("<additional_instructions>");
    expect(result).toContain("- Always cite sources");
    expect(result).toContain("- Be concise");
    expect(result).toContain("</additional_instructions>");
  });

  it("combines all sections in correct order", () => {
    const result = buildAgentSystemPrompt({
      basePrompt: "Base prompt",
      contextMd: "Context",
      toolContext: "Tools",
      additionalInstructions: ["Instruction"],
    });

    const baseIndex = result.indexOf("Base prompt");
    const contextIndex = result.indexOf("<context>");
    const toolsIndex = result.indexOf("<available_tools>");
    const instructionsIndex = result.indexOf("<additional_instructions>");

    expect(baseIndex).toBeLessThan(contextIndex);
    expect(contextIndex).toBeLessThan(toolsIndex);
    expect(toolsIndex).toBeLessThan(instructionsIndex);
  });
});

describe("createAgentMemoryManager", () => {
  let mockMemory: MemoryConsolidator;
  let manager: ReturnType<typeof createAgentMemoryManager>;

  beforeEach(() => {
    mockMemory = createMockMemoryConsolidator();
    manager = createAgentMemoryManager({ memory: mockMemory });
  });

  describe("load", () => {
    it("loads memory through loadAgentMemory", async () => {
      const ctx = createTestContext();
      const contextData = createTestContextData();

      const result = await manager.load(ctx, contextData);

      expect(result.contextMd).toBeDefined();
      expect(result.tokenCount).toBe(500);
    });
  });

  describe("buildSystemPrompt", () => {
    it("builds system prompt", () => {
      const result = manager.buildSystemPrompt({
        contextMd: "# context.md",
        basePrompt: "You are helpful",
      });

      expect(result).toContain("<context>");
      expect(result).toContain("You are helpful");
    });
  });

  describe("storeConversation", () => {
    it("stores conversation turn", async () => {
      const ctx = createTestContext();

      await manager.storeConversation("Hello", "Hi there!", ctx, 1);

      expect(mockMemory.storeConversationTurn).toHaveBeenCalledWith(
        "Hello",
        "Hi there!",
        expect.objectContaining({
          teamId: "team_123",
          userId: "user_456",
          turnNumber: 1,
        })
      );
    });

    it("generates session ID if not present", async () => {
      const ctx = createTestContext({ sessionId: undefined });

      await manager.storeConversation("Hello", "Hi", ctx, 1);

      expect(mockMemory.storeConversationTurn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          sessionId: expect.stringMatching(SESSION_ID_PATTERN),
        })
      );
    });
  });

  describe("storeToolCall", () => {
    it("stores tool call with result", async () => {
      const ctx = createTestContext();

      await manager.storeToolCall(
        "search_hybrid",
        { query: "test" },
        { results: [] },
        true,
        ctx
      );

      expect(mockMemory.storeToolCall).toHaveBeenCalledWith(
        "search_hybrid",
        { query: "test" },
        { results: [] },
        true,
        expect.objectContaining({ teamId: "team_123" })
      );
    });
  });

  describe("learnFact", () => {
    it("learns a fact and returns ID", async () => {
      const ctx = createTestContext();

      const factId = await manager.learnFact(
        "Important fact",
        "general",
        ["doc_1"],
        ctx
      );

      expect(factId).toBe("fact_123");
      expect(mockMemory.learnFact).toHaveBeenCalledWith(
        "Important fact",
        "general",
        ["doc_1"],
        expect.objectContaining({ confidence: 0.7 })
      );
    });

    it("accepts custom confidence", async () => {
      const ctx = createTestContext();

      await manager.learnFact(
        "High confidence fact",
        "verified",
        [],
        ctx,
        0.95
      );

      expect(mockMemory.learnFact).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ confidence: 0.95 })
      );
    });
  });

  describe("learnProcedure", () => {
    it("learns a procedure", async () => {
      const ctx = createTestContext();

      const procId = await manager.learnProcedure(
        "search_then_answer",
        "user asks question",
        "call search_hybrid first",
        ctx
      );

      expect(procId).toBe("proc_456");
    });
  });

  describe("recordProcedureOutcome", () => {
    it("records procedure outcome", async () => {
      await manager.recordProcedureOutcome("proc_123", true);

      expect(mockMemory.recordProcedureOutcome).toHaveBeenCalledWith(
        "proc_123",
        true
      );
    });
  });

  describe("suggestAction", () => {
    it("suggests action based on trigger", async () => {
      const ctx = createTestContext();

      const suggestion = await manager.suggestAction(
        "user asks about docs",
        ctx
      );

      expect(suggestion).toEqual({ action: "search_hybrid", confidence: 0.85 });
    });
  });

  describe("getRelevantKnowledge", () => {
    it("retrieves relevant knowledge", async () => {
      const ctx = createTestContext();

      const knowledge = await manager.getRelevantKnowledge(
        "project status",
        ctx
      );

      expect(knowledge).toHaveLength(1);
      expect(knowledge[0]).toEqual({
        content: "Fact 1",
        category: "general",
        confidence: 0.9,
      });
    });

    it("passes categories filter", async () => {
      const ctx = createTestContext();

      await manager.getRelevantKnowledge("test", ctx, ["technical"]);

      expect(mockMemory.getRelevantKnowledge).toHaveBeenCalledWith(
        "test",
        "team_123",
        ["technical"]
      );
    });
  });

  describe("getStats", () => {
    it("returns memory statistics", async () => {
      const stats = await manager.getStats("team_123");

      expect(stats).toEqual({
        episodic: 100,
        semantic: 50,
        procedural: 20,
        total: 170,
      });
    });
  });
});

describe("injectMemoryIntoState", () => {
  it("injects context.md into state", () => {
    const state = createTestState();
    const loadedMemory = {
      contextMd: "# context.md\nTeam content",
      episodic: "",
      semantic: "",
      procedural: "",
      tokenCount: 100,
      entryCount: 5,
    };

    const result = injectMemoryIntoState(state, loadedMemory);

    expect(result.values.get("__contextMd")).toBe("# context.md\nTeam content");
    expect(result.values.get("__memoryTokens")).toBe(100);
    expect(result.values.get("__memoryEntries")).toBe(5);
  });

  it("returns same state reference", () => {
    const state = createTestState();
    const loadedMemory = {
      contextMd: "",
      episodic: "",
      semantic: "",
      procedural: "",
      tokenCount: 0,
      entryCount: 0,
    };

    const result = injectMemoryIntoState(state, loadedMemory);

    expect(result).toBe(state);
  });
});

describe("extractContextMdFromState", () => {
  it("extracts context.md from state", () => {
    const state = createTestState();
    state.values.set("__contextMd", "# context.md\nContent");

    const result = extractContextMdFromState(state);

    expect(result).toBe("# context.md\nContent");
  });

  it("returns null if not present", () => {
    const state = createTestState();

    const result = extractContextMdFromState(state);

    expect(result).toBeNull();
  });
});

describe("withAgentMemory", () => {
  let mockMemory: MemoryConsolidator;

  beforeEach(() => {
    mockMemory = createMockMemoryConsolidator();
  });

  it("executes with enriched context", async () => {
    const ctx = createTestContext();
    const contextData = createTestContextData();
    let receivedPrompt: string | undefined;
    let receivedContext: AgentExecutionContext | undefined;

    const result = await withAgentMemory(
      ctx,
      { memory: mockMemory, contextData },
      (enrichedCtx, systemPrompt) => {
        receivedContext = enrichedCtx;
        receivedPrompt = systemPrompt;
        return Promise.resolve("execution result");
      }
    );

    expect(result).toBe("execution result");
    expect(receivedPrompt).toContain("<context>");
    expect(receivedContext?.state.values.get("__contextMd")).toBeDefined();
  });

  it("passes loaded memory to execute function", async () => {
    const ctx = createTestContext();
    const contextData = createTestContextData();
    let receivedMemory: unknown;

    await withAgentMemory(
      ctx,
      { memory: mockMemory, contextData },
      (_ctx, _prompt, loadedMemory) => {
        receivedMemory = loadedMemory;
        return Promise.resolve(null);
      }
    );

    expect(receivedMemory).toEqual(
      expect.objectContaining({
        episodic: "Recent conversation about project planning",
        tokenCount: 500,
      })
    );
  });

  it("includes base prompt and instructions", async () => {
    const ctx = createTestContext();
    const contextData = createTestContextData();
    let receivedPrompt = "";

    await withAgentMemory(
      ctx,
      {
        memory: mockMemory,
        contextData,
        basePrompt: "You are an expert.",
        additionalInstructions: ["Be thorough"],
      },
      (_ctx, systemPrompt) => {
        receivedPrompt = systemPrompt;
        return Promise.resolve(null);
      }
    );

    expect(receivedPrompt).toContain("You are an expert.");
    expect(receivedPrompt).toContain("Be thorough");
  });
});

describe("createMemoryCallbacks", () => {
  let mockMemory: MemoryConsolidator;
  let manager: ReturnType<typeof createAgentMemoryManager>;

  beforeEach(() => {
    mockMemory = createMockMemoryConsolidator();
    manager = createAgentMemoryManager({ memory: mockMemory });
  });

  describe("onStepFinish", () => {
    it("stores tool calls from step", async () => {
      const ctx = createTestContext();
      const callbacks = createMemoryCallbacks(manager, ctx);

      await callbacks.onStepFinish({
        text: "Result text",
        toolCalls: [{ toolName: "search_hybrid", input: { query: "test" } }],
        toolResults: [{ toolName: "search_hybrid", output: { results: [] } }],
      });

      expect(mockMemory.storeToolCall).toHaveBeenCalledWith(
        "search_hybrid",
        { query: "test" },
        { results: [] },
        true,
        expect.anything()
      );
    });

    it("handles missing tool results", async () => {
      const ctx = createTestContext();
      const callbacks = createMemoryCallbacks(manager, ctx);

      await callbacks.onStepFinish({
        text: "",
        toolCalls: [{ toolName: "doc_get", input: { id: "doc_1" } }],
        toolResults: [],
      });

      expect(mockMemory.storeToolCall).toHaveBeenCalledWith(
        "doc_get",
        { id: "doc_1" },
        undefined,
        false,
        expect.anything()
      );
    });

    it("calls config callback when provided", async () => {
      const ctx = createTestContext();
      const toolCallTracker: { name: string; success: boolean }[] = [];
      const callbacks = createMemoryCallbacks(manager, ctx, {
        memoryManager: manager,
        contextData: createTestContextData(),
        onToolCall: (name, success) => toolCallTracker.push({ name, success }),
      });

      await callbacks.onStepFinish({
        text: "",
        toolCalls: [{ toolName: "search", input: {} }],
        toolResults: [{ toolName: "search", output: {} }],
      });

      expect(toolCallTracker).toContainEqual({ name: "search", success: true });
    });
  });

  describe("onConversationTurn", () => {
    it("stores conversation and increments turn number", async () => {
      const ctx = createTestContext();
      const callbacks = createMemoryCallbacks(manager, ctx);

      await callbacks.onConversationTurn("Hello", "Hi there!");
      await callbacks.onConversationTurn("How are you?", "I'm fine!");

      expect(mockMemory.storeConversationTurn).toHaveBeenCalledTimes(2);
      expect(mockMemory.storeConversationTurn).toHaveBeenNthCalledWith(
        1,
        "Hello",
        "Hi there!",
        expect.objectContaining({ turnNumber: 1 })
      );
      expect(mockMemory.storeConversationTurn).toHaveBeenNthCalledWith(
        2,
        "How are you?",
        "I'm fine!",
        expect.objectContaining({ turnNumber: 2 })
      );
    });

    it("calls config callback when provided", async () => {
      const ctx = createTestContext();
      const turns: number[] = [];
      const callbacks = createMemoryCallbacks(manager, ctx, {
        memoryManager: manager,
        contextData: createTestContextData(),
        onConversationTurn: (n) => turns.push(n),
      });

      await callbacks.onConversationTurn("Input", "Output");

      expect(turns).toEqual([1]);
    });
  });

  describe("onFactDiscovered", () => {
    it("learns fact and returns ID", async () => {
      const ctx = createTestContext();
      const callbacks = createMemoryCallbacks(manager, ctx);

      const factId = await callbacks.onFactDiscovered(
        "Important discovery",
        "research",
        ["doc_1", "doc_2"]
      );

      expect(factId).toBe("fact_123");
      expect(mockMemory.learnFact).toHaveBeenCalledWith(
        "Important discovery",
        "research",
        ["doc_1", "doc_2"],
        expect.anything()
      );
    });

    it("calls config callback when provided", async () => {
      const ctx = createTestContext();
      const facts: { id: string; category: string }[] = [];
      const callbacks = createMemoryCallbacks(manager, ctx, {
        memoryManager: manager,
        contextData: createTestContextData(),
        onFactLearned: (id, category) => facts.push({ id, category }),
      });

      await callbacks.onFactDiscovered("Fact", "tech", []);

      expect(facts).toContainEqual({ id: "fact_123", category: "tech" });
    });
  });
});
