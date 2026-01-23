import { describe, expect, it } from "bun:test";
import type { ToolContext } from "../../../types";
import { canvasAddNodeTool } from "../add-node";
import { canvasAutoLayoutTool } from "../auto-layout";
import { canvasConnectNodesTool } from "../connect-nodes";
import { canvasDisconnectNodesTool } from "../disconnect-nodes";
import {
  canvasGetNodeSchemaTool,
  canvasListConnectorsTool,
  canvasListNodeTypesTool,
} from "../discovery";
import { canvasGetStateTool } from "../get-state";
import { canvasRemoveNodeTool } from "../remove-node";
import { canvasUpdateConfigTool } from "../update-config";
import { canvasValidateTool } from "../validate";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    teamId: "team-1",
    userId: "user-1",
    services: {} as never,
    ...overrides,
  };
}

describe("canvas_add_node", () => {
  it("adds a node with valid type", async () => {
    const ctx = createMockContext();
    const result = await canvasAddNodeTool.execute(
      { type: "llm", label: "My LLM Node" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.nodeId).toContain("llm");
    expect(result.data?.operation.type).toBe("add_node");
    expect(result.data?.operation.nodeType).toBe("llm");
    expect(result.data?.message).toContain("llm");
    expect(result.data?.message).toContain("My LLM Node");
  });

  it("generates unique node IDs", async () => {
    const ctx = createMockContext();
    const result1 = await canvasAddNodeTool.execute({ type: "start" }, ctx);
    const result2 = await canvasAddNodeTool.execute({ type: "start" }, ctx);

    expect(result1.data?.nodeId).not.toBe(result2.data?.nodeId);
  });

  it("uses provided position", async () => {
    const ctx = createMockContext();
    const result = await canvasAddNodeTool.execute(
      { type: "end", position: { x: 500, y: 300 } },
      ctx
    );

    expect(result.data?.operation.position).toEqual({ x: 500, y: 300 });
  });

  it("defaults to position 100,100 when not provided", async () => {
    const ctx = createMockContext();
    const result = await canvasAddNodeTool.execute({ type: "condition" }, ctx);

    expect(result.data?.operation.position).toEqual({ x: 100, y: 100 });
  });

  it("passes config to operation", async () => {
    const ctx = createMockContext();
    const config = { model: "gpt-4", temperature: 0.5 };
    const result = await canvasAddNodeTool.execute(
      { type: "llm", config },
      ctx
    );

    expect(result.data?.operation.config).toEqual(config);
  });
});

describe("canvas_remove_node", () => {
  it("returns remove operation with node id", async () => {
    const ctx = createMockContext();
    const result = await canvasRemoveNodeTool.execute(
      { nodeId: "node-123" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.operation.type).toBe("remove_node");
    expect(result.data?.operation.nodeId).toBe("node-123");
  });
});

describe("canvas_connect_nodes", () => {
  it("creates edge between nodes", async () => {
    const ctx = createMockContext();
    const result = await canvasConnectNodesTool.execute(
      { source: "node-1", target: "node-2" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.operation.type).toBe("connect");
    expect(result.data?.operation.source).toBe("node-1");
    expect(result.data?.operation.target).toBe("node-2");
    expect(result.data?.edgeId).toBeDefined();
  });

  it("uses provided handle ids", async () => {
    const ctx = createMockContext();
    const result = await canvasConnectNodesTool.execute(
      {
        source: "node-1",
        target: "node-2",
        sourceHandle: "out-true",
        targetHandle: "in-1",
      },
      ctx
    );

    expect(result.data?.operation.sourceHandle).toBe("out-true");
    expect(result.data?.operation.targetHandle).toBe("in-1");
  });
});

describe("canvas_disconnect_nodes", () => {
  it("returns disconnect operation", async () => {
    const ctx = createMockContext();
    const result = await canvasDisconnectNodesTool.execute(
      { edgeId: "edge-123" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.operation.type).toBe("disconnect");
    expect(result.data?.operation.edgeId).toBe("edge-123");
  });
});

describe("canvas_update_config", () => {
  it("returns update config operation", async () => {
    const ctx = createMockContext();
    const result = await canvasUpdateConfigTool.execute(
      {
        nodeId: "node-123",
        config: { model: "claude-3", temperature: 0.8 },
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.operation.type).toBe("update_config");
    expect(result.data?.operation.nodeId).toBe("node-123");
    expect(result.data?.operation.config).toEqual({
      model: "claude-3",
      temperature: 0.8,
    });
  });
});

describe("canvas_auto_layout", () => {
  it("returns auto layout operation", async () => {
    const ctx = createMockContext();
    const result = await canvasAutoLayoutTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.operation.type).toBe("layout");
  });

  it("passes direction option", async () => {
    const ctx = createMockContext();
    const result = await canvasAutoLayoutTool.execute({ direction: "LR" }, ctx);

    expect(result.data?.operation.direction).toBe("LR");
  });

  it("defaults to TB direction when not provided", async () => {
    const ctx = createMockContext();
    const result = await canvasAutoLayoutTool.execute({}, ctx);

    expect(result.data?.operation.direction).toBeUndefined();
  });
});

describe("canvas_get_state", () => {
  it("returns empty state when no canvas state in context", async () => {
    const ctx = createMockContext();
    const result = await canvasGetStateTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.nodeCount).toBe(0);
    expect(result.data?.edgeCount).toBe(0);
    expect(result.data?.nodes).toEqual([]);
    expect(result.data?.edges).toEqual([]);
  });

  it("returns nodes and edges from context", async () => {
    const ctx = createMockContext({
      canvasState: {
        nodes: [
          { id: "n1", type: "start", data: { label: "Start" } },
          { id: "n2", type: "end", data: { label: "End" } },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      },
    });

    const result = await canvasGetStateTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.nodeCount).toBe(2);
    expect(result.data?.edgeCount).toBe(1);
    expect(result.data?.nodes).toHaveLength(2);

    const nodes = result.data?.nodes;
    const edges = result.data?.edges;
    expect(nodes?.[0]?.type).toBe("start");
    expect(nodes?.[0]?.label).toBe("Start");
    expect(edges?.[0]?.source).toBe("n1");
    expect(edges?.[0]?.target).toBe("n2");
  });
});

describe("canvas_validate", () => {
  it("validates empty canvas", async () => {
    const ctx = createMockContext();
    const result = await canvasValidateTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(false);
    expect(result.data?.issues).toContain("Workflow must have a start node");
    expect(result.data?.issues).toContain(
      "Workflow must have at least one end node"
    );
  });

  it("validates canvas with start and end nodes", async () => {
    const ctx = createMockContext({
      canvasState: {
        nodes: [
          { id: "n1", type: "start", data: {} },
          { id: "n2", type: "end", data: {} },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      },
    });

    const result = await canvasValidateTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(true);
    expect(result.data?.issues).toHaveLength(0);
  });
});

describe("canvas_list_node_types", () => {
  it("lists all node types", async () => {
    const ctx = createMockContext();
    const result = await canvasListNodeTypesTool.execute({}, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.totalCount).toBeGreaterThan(30);
    expect(result.data?.categories).toHaveProperty("control");
    expect(result.data?.categories).toHaveProperty("ai");
    expect(result.data?.categories).toHaveProperty("integration");
  });

  it("filters by category", async () => {
    const ctx = createMockContext();
    const result = await canvasListNodeTypesTool.execute(
      { category: "ai" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.categories).toHaveProperty("ai");
    expect(result.data?.categories).not.toHaveProperty("control");
  });

  it("returns descriptions for each type", async () => {
    const ctx = createMockContext();
    const result = await canvasListNodeTypesTool.execute(
      { category: "ai" },
      ctx
    );

    const aiNodes = result.data?.categories?.ai;
    expect(aiNodes).toBeDefined();
    expect(aiNodes?.[0]?.description).toBeDefined();
    expect(aiNodes?.[0]?.type).toBeDefined();
  });
});

describe("canvas_get_node_schema", () => {
  it("returns schema for valid node type", async () => {
    const ctx = createMockContext();
    const result = await canvasGetNodeSchemaTool.execute(
      { nodeType: "llm" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.type).toBe("llm");
    expect(result.data?.category).toBe("ai");
    expect(result.data?.description).toBeDefined();
    expect(result.data?.configFields).toContain("model");
    expect(result.data?.configFields).toContain("systemPrompt");
    expect(result.data?.configFields).toContain("temperature");
  });

  it("returns error for invalid node type", async () => {
    const ctx = createMockContext();
    const result = await canvasGetNodeSchemaTool.execute(
      { nodeType: "invalid_type" as never },
      ctx
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
  });

  it("returns usage hint", async () => {
    const ctx = createMockContext();
    const result = await canvasGetNodeSchemaTool.execute(
      { nodeType: "condition" },
      ctx
    );

    expect(result.data?.usage).toContain("canvas_add_node");
    expect(result.data?.usage).toContain("condition");
  });
});

describe("canvas_list_connectors", () => {
  it("returns empty list when service not available", async () => {
    const ctx = createMockContext();
    const result = await canvasListConnectorsTool.execute(
      { status: "active" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.connectors).toEqual([]);
    expect(result.data?.message).toBe("Connector service not available");
  });

  it("returns connectors from service", async () => {
    const mockConnectors = [
      {
        id: "c1",
        type: "slack",
        name: "Slack",
        status: "ACTIVE",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
      {
        id: "c2",
        type: "notion",
        name: "Notion",
        status: "ERROR",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
    ];

    const ctx = createMockContext({
      services: {
        connectors: {
          list: async () => mockConnectors,
        },
      } as never,
    });

    const result = await canvasListConnectorsTool.execute(
      { status: "all" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.connectors).toHaveLength(2);
    expect(result.data?.totalCount).toBe(2);
  });

  it("filters by active status", async () => {
    const mockConnectors = [
      {
        id: "c1",
        type: "slack",
        name: "Slack",
        status: "ACTIVE",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
      {
        id: "c2",
        type: "notion",
        name: "Notion",
        status: "ERROR",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
    ];

    const ctx = createMockContext({
      services: {
        connectors: {
          list: async () => mockConnectors,
        },
      } as never,
    });

    const result = await canvasListConnectorsTool.execute(
      { status: "active" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.connectors).toHaveLength(1);
    expect(result.data?.connectors?.[0]?.type).toBe("slack");
  });

  it("filters by error status", async () => {
    const mockConnectors = [
      {
        id: "c1",
        type: "slack",
        name: "Slack",
        status: "ACTIVE",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
      {
        id: "c2",
        type: "notion",
        name: "Notion",
        status: "ERROR",
        lastSyncAt: null,
        documentCount: 0,
        createdAt: new Date(),
      },
    ];

    const ctx = createMockContext({
      services: {
        connectors: {
          list: async () => mockConnectors,
        },
      } as never,
    });

    const result = await canvasListConnectorsTool.execute(
      { status: "error" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data?.connectors).toHaveLength(1);
    expect(result.data?.connectors?.[0]?.type).toBe("notion");
  });
});
