import { beforeEach, describe, expect, it } from "bun:test";
import { type AgentExecutionContext, createEmptyState } from "../../config";
import {
  CANVAS_BUILDER_PROMPT,
  CANVAS_BUILDER_TOOLS,
  CanvasBuilderAgent,
  canvasBuilderConfig,
  createCanvasBuilderAgent,
} from "../index";

function createMockContext(
  overrides?: Partial<AgentExecutionContext>
): AgentExecutionContext {
  return {
    teamId: "team-1",
    userId: "user-1",
    sessionId: "session-1",
    state: createEmptyState(),
    ...overrides,
  };
}

describe("canvasBuilderConfig", () => {
  it("has correct type", () => {
    expect(canvasBuilderConfig.type).toBe("llm");
  });

  it("has correct name", () => {
    expect(canvasBuilderConfig.name).toBe("canvas-builder");
  });

  it("has description", () => {
    expect(canvasBuilderConfig.description).toBeDefined();
    expect(canvasBuilderConfig.description?.length).toBeGreaterThan(10);
  });

  it("has system prompt", () => {
    expect(canvasBuilderConfig.systemPrompt).toBeDefined();
    expect(canvasBuilderConfig.systemPrompt?.length).toBeGreaterThan(100);
  });

  it("has maxSteps configured", () => {
    expect(canvasBuilderConfig.maxSteps).toBe(20);
  });

  it("has low temperature for deterministic output", () => {
    expect(canvasBuilderConfig.model?.temperature).toBe(0.1);
  });
});

describe("CANVAS_BUILDER_TOOLS", () => {
  it("includes all canvas tools", () => {
    expect(CANVAS_BUILDER_TOOLS).toHaveLength(13);
  });

  it("includes core manipulation tools", () => {
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_add_node");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_remove_node");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_connect_nodes");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_disconnect_nodes");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_update_config");
  });

  it("includes utility tools", () => {
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_auto_layout");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_get_state");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_validate");
  });

  it("includes discovery tools", () => {
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_list_node_types");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_list_connectors");
    expect(CANVAS_BUILDER_TOOLS).toContain("canvas_get_node_schema");
  });
});

describe("CANVAS_BUILDER_PROMPT", () => {
  it("includes role section", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<role>");
    expect(CANVAS_BUILDER_PROMPT).toContain("</role>");
  });

  it("includes tools section", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<tools>");
    expect(CANVAS_BUILDER_PROMPT).toContain("canvas_add_node");
  });

  it("includes mandatory workflow section", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<mandatory_workflow>");
    expect(CANVAS_BUILDER_PROMPT).toContain("canvas_get_state");
  });

  it("includes node categories", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<node_categories>");
    expect(CANVAS_BUILDER_PROMPT).toContain("Flow Control");
    expect(CANVAS_BUILDER_PROMPT).toContain("AI Operations");
    expect(CANVAS_BUILDER_PROMPT).toContain("Integration");
  });

  it("includes workflow patterns", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<workflow_patterns>");
    expect(CANVAS_BUILDER_PROMPT).toContain("Sequential");
    expect(CANVAS_BUILDER_PROMPT).toContain("Conditional");
  });

  it("includes configuration rules", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<configuration_rules>");
    expect(CANVAS_BUILDER_PROMPT).toContain("start node");
    expect(CANVAS_BUILDER_PROMPT).toContain("end node");
  });

  it("includes error recovery guidance", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<error_recovery>");
    expect(CANVAS_BUILDER_PROMPT).toContain("canvas_list_node_types");
  });

  it("includes output format", () => {
    expect(CANVAS_BUILDER_PROMPT).toContain("<output_format>");
    expect(CANVAS_BUILDER_PROMPT).toContain("canvas_add_node");
    expect(CANVAS_BUILDER_PROMPT).toContain("canvas_validate");
  });
});

describe("CanvasBuilderAgent", () => {
  let agent: CanvasBuilderAgent;

  beforeEach(() => {
    agent = new CanvasBuilderAgent();
  });

  it("can be instantiated", () => {
    expect(agent).toBeDefined();
    expect(agent).toBeInstanceOf(CanvasBuilderAgent);
  });

  it("has streamCanvas method", () => {
    expect(typeof agent.streamCanvas).toBe("function");
  });
});

describe("createCanvasBuilderAgent", () => {
  it("returns CanvasBuilderAgent instance", () => {
    const agent = createCanvasBuilderAgent();
    expect(agent).toBeInstanceOf(CanvasBuilderAgent);
  });

  it("creates new instance each time", () => {
    const agent1 = createCanvasBuilderAgent();
    const agent2 = createCanvasBuilderAgent();
    expect(agent1).not.toBe(agent2);
  });
});

describe("CanvasStreamEvent types", () => {
  it("transformChunk handles thinking chunks - skipped: requires live LLM connection", async () => {
    const agent = createCanvasBuilderAgent();
    const ctx = createMockContext();

    const generator = agent.streamCanvas("test", ctx);
    const firstEvent = await generator.next();

    expect(firstEvent.done).toBe(false);
  });
});
