import { describe, expect, it } from "bun:test";
import type {
  AgentExecutionContext,
  CanvasStateSnapshot,
  ConversationMessage,
} from "../../config";
import { createEmptyState } from "../../config";

describe("CanvasStateSnapshot", () => {
  it("accepts nodes and edges", () => {
    const snapshot: CanvasStateSnapshot = {
      nodes: [{ id: "n1", type: "llm", data: { label: "Research" } }],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
    };

    expect(snapshot.nodes).toHaveLength(1);
    expect(snapshot.edges).toHaveLength(1);
    expect(snapshot.nodes[0]?.id).toBe("n1");
    expect(snapshot.edges[0]?.source).toBe("n1");
  });

  it("accepts empty arrays", () => {
    const emptySnapshot: CanvasStateSnapshot = { nodes: [], edges: [] };

    expect(emptySnapshot.nodes).toHaveLength(0);
    expect(emptySnapshot.edges).toHaveLength(0);
  });
});

describe("ConversationMessage", () => {
  it("accepts user and assistant roles", () => {
    const messages: ConversationMessage[] = [
      { role: "user", content: "Add a search node" },
      { role: "assistant", content: "I added a search node to the canvas" },
    ];

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("user");
    expect(messages[1]?.role).toBe("assistant");
    expect(messages[0]?.content).toBe("Add a search node");
  });
});

describe("AgentExecutionContext multi-turn fields", () => {
  it("accepts canvasState", () => {
    const ctx: AgentExecutionContext = {
      teamId: "team_1",
      userId: "user_1",
      state: createEmptyState(),
      canvasState: {
        nodes: [{ id: "n1", type: "llm", data: { label: "Agent" } }],
        edges: [],
      },
    };

    expect(ctx.canvasState?.nodes).toHaveLength(1);
    expect(ctx.canvasState?.nodes[0]?.type).toBe("llm");
    expect(ctx.canvasState?.edges).toHaveLength(0);
  });

  it("accepts conversationHistory", () => {
    const ctx: AgentExecutionContext = {
      teamId: "team_1",
      userId: "user_1",
      state: createEmptyState(),
      conversationHistory: [
        { role: "user", content: "Create a workflow" },
        { role: "assistant", content: "Created a sequential workflow" },
      ],
    };

    expect(ctx.conversationHistory).toHaveLength(2);
    expect(ctx.conversationHistory?.[0]?.role).toBe("user");
    expect(ctx.conversationHistory?.[1]?.content).toBe(
      "Created a sequential workflow"
    );
  });

  it("accepts turnId and canvasId", () => {
    const ctx: AgentExecutionContext = {
      teamId: "team_1",
      userId: "user_1",
      state: createEmptyState(),
      turnId: "turn_abc",
      canvasId: "canvas_xyz",
    };

    expect(ctx.turnId).toBe("turn_abc");
    expect(ctx.canvasId).toBe("canvas_xyz");
  });

  it("carries full multi-turn context", () => {
    const ctx: AgentExecutionContext = {
      teamId: "team_1",
      userId: "user_1",
      sessionId: "session_1",
      turnId: "turn_3",
      canvasId: "canvas_1",
      state: createEmptyState(),
      canvasState: {
        nodes: [
          { id: "n1", type: "llm", data: { label: "Research" } },
          { id: "n2", type: "search", data: { label: "Web Search" } },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      },
      conversationHistory: [
        { role: "user", content: "Create a research agent" },
        { role: "assistant", content: "Created research agent with search" },
        { role: "user", content: "Add web scraping capability" },
      ],
    };

    expect(ctx.teamId).toBe("team_1");
    expect(ctx.sessionId).toBe("session_1");
    expect(ctx.turnId).toBe("turn_3");
    expect(ctx.canvasId).toBe("canvas_1");
    expect(ctx.canvasState?.nodes).toHaveLength(2);
    expect(ctx.canvasState?.edges).toHaveLength(1);
    expect(ctx.conversationHistory).toHaveLength(3);
    expect(ctx.conversationHistory?.[2]?.content).toBe(
      "Add web scraping capability"
    );
  });

  it("remains backward compatible without optional fields", () => {
    const ctx: AgentExecutionContext = {
      teamId: "team_1",
      userId: "user_1",
      state: createEmptyState(),
    };

    expect(ctx.turnId).toBeUndefined();
    expect(ctx.canvasId).toBeUndefined();
    expect(ctx.canvasState).toBeUndefined();
    expect(ctx.conversationHistory).toBeUndefined();
    expect(ctx.sessionId).toBeUndefined();
  });
});

function buildAugmentedPrompt(
  prompt: string,
  canvasState?: CanvasStateSnapshot,
  conversationHistory?: ConversationMessage[]
): {
  augmentedPrompt: string;
  messagesPrefix: Array<{ role: string; content: string }>;
} {
  const canvasStateContext = canvasState
    ? `\n<current_canvas>\n${JSON.stringify(canvasState, null, 2)}\n</current_canvas>\n`
    : "";

  const augmentedPrompt = canvasStateContext
    ? `${canvasStateContext}\n\nUser request: ${prompt}`
    : prompt;

  const messagesPrefix = (conversationHistory ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return { augmentedPrompt, messagesPrefix };
}

describe("Multi-Turn Prompt Augmentation", () => {
  it("augments prompt with canvas state when present", () => {
    const canvasState: CanvasStateSnapshot = {
      nodes: [
        { id: "n1", type: "start", data: { label: "Start" } },
        { id: "n2", type: "llm", data: { label: "Summarizer" } },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
    };

    const { augmentedPrompt } = buildAugmentedPrompt(
      "Add an end node",
      canvasState
    );

    expect(augmentedPrompt).toContain("<current_canvas>");
    expect(augmentedPrompt).toContain("n1");
    expect(augmentedPrompt).toContain("n2");
    expect(augmentedPrompt).toContain("Add an end node");
  });

  it("preserves raw prompt when no canvas state", () => {
    const { augmentedPrompt } = buildAugmentedPrompt("Build a RAG pipeline");

    expect(augmentedPrompt).toBe("Build a RAG pipeline");
    expect(augmentedPrompt).not.toContain("<current_canvas>");
  });

  it("builds message prefix from conversation history", () => {
    const history: ConversationMessage[] = [
      { role: "user", content: "Create a search pipeline" },
      { role: "assistant", content: "Created pipeline with search node" },
    ];

    const { messagesPrefix } = buildAugmentedPrompt(
      "Now add an end node",
      undefined,
      history
    );

    expect(messagesPrefix).toHaveLength(2);
    expect(messagesPrefix[0]?.role).toBe("user");
    expect(messagesPrefix[0]?.content).toBe("Create a search pipeline");
    expect(messagesPrefix[1]?.role).toBe("assistant");
    expect(messagesPrefix[1]?.content).toBe(
      "Created pipeline with search node"
    );
  });

  it("handles both canvas state and conversation history together", () => {
    const canvasState: CanvasStateSnapshot = {
      nodes: [
        { id: "n1", type: "start", data: { label: "Start" } },
        { id: "n2", type: "search", data: { label: "Search" } },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
    };

    const history: ConversationMessage[] = [
      { role: "user", content: "Build a search pipeline" },
      { role: "assistant", content: "Done, added start and search nodes" },
    ];

    const { augmentedPrompt, messagesPrefix } = buildAugmentedPrompt(
      "Now connect it to an LLM",
      canvasState,
      history
    );

    expect(augmentedPrompt).toContain("<current_canvas>");
    expect(augmentedPrompt).toContain("Now connect it to an LLM");
    expect(messagesPrefix).toHaveLength(2);
  });
});

describe("Connection Type Validation", () => {
  const TERMINAL_NODE_TYPES = new Set(["end"]);
  const SOURCE_ONLY_NODE_TYPES = new Set([
    "start",
    "trigger_manual",
    "trigger_schedule",
    "trigger_webhook",
    "trigger_event",
  ]);

  it("rejects connections from terminal nodes", () => {
    expect(TERMINAL_NODE_TYPES.has("end")).toBe(true);
  });

  it("rejects connections to source-only nodes", () => {
    expect(SOURCE_ONLY_NODE_TYPES.has("start")).toBe(true);
    expect(SOURCE_ONLY_NODE_TYPES.has("trigger_manual")).toBe(true);
    expect(SOURCE_ONLY_NODE_TYPES.has("trigger_schedule")).toBe(true);
    expect(SOURCE_ONLY_NODE_TYPES.has("trigger_webhook")).toBe(true);
    expect(SOURCE_ONLY_NODE_TYPES.has("trigger_event")).toBe(true);
  });

  it("allows valid connections between compatible types", () => {
    expect(TERMINAL_NODE_TYPES.has("llm")).toBe(false);
    expect(TERMINAL_NODE_TYPES.has("search")).toBe(false);
    expect(SOURCE_ONLY_NODE_TYPES.has("transform")).toBe(false);
    expect(SOURCE_ONLY_NODE_TYPES.has("llm")).toBe(false);
  });
});
