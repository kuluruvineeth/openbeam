import { z } from "zod";
import { defineTool, failure, success } from "../../tools/builder";
import type { CanvasToolContext } from "../types";

export const canvasGetStateTool = defineTool({
  name: "canvas_get_state",
  description: `Get the current canvas state including all nodes and connections.

USE THIS WHEN:
- Understanding the current workflow structure
- Before making modifications
- Analyzing the agent being built

RETURNS: Complete canvas state with nodes, connections, and viewport.`,
  category: "canvas",
  searchKeywords: ["canvas", "state", "get", "read", "current"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    includeHidden: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include hidden nodes in the response"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    const nodes = params.includeHidden
      ? state.nodes
      : state.nodes.filter((n) => n.visible);

    return success(
      {
        nodes,
        connections: state.connections,
        viewport: state.viewport,
        selection: state.selection,
        nodeCount: nodes.length,
        connectionCount: state.connections.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasGetNodeTool = defineTool({
  name: "canvas_get_node",
  description: `Get details of a specific node by ID.

USE THIS WHEN:
- Need detailed information about a specific node
- Following up on a search or query result

RETURNS: Node details including type, position, content, and connections.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "get", "details"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeId: z.string().describe("ID of the node to retrieve"),
    includeConnections: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include incoming and outgoing connections"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const node = state.nodes.find((n) => n.id === params.nodeId);

    if (!node) {
      return failure("NOT_FOUND", `Node not found: ${params.nodeId}`);
    }

    let connections:
      | {
          incoming: typeof state.connections;
          outgoing: typeof state.connections;
        }
      | undefined;

    if (params.includeConnections) {
      connections = {
        incoming: state.connections.filter(
          (c) => c.targetNodeId === params.nodeId
        ),
        outgoing: state.connections.filter(
          (c) => c.sourceNodeId === params.nodeId
        ),
      };
    }

    return success({ node, connections, found: true }, { source: "canvas" });
  },
});

export const canvasQueryNodesTool = defineTool({
  name: "canvas_query_nodes",
  description: `Query nodes by type, properties, or content.

USE THIS WHEN:
- Finding specific types of nodes
- Searching for nodes with certain properties
- Filtering nodes for analysis

RETURNS: List of matching nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "query", "search", "filter"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    types: z.array(z.string()).optional().describe("Filter by node types"),
    parentId: z
      .string()
      .optional()
      .describe("Filter by parent (for grouped nodes)"),
    locked: z.boolean().optional().describe("Filter by locked state"),
    visible: z.boolean().optional().describe("Filter by visibility"),
    contentContains: z
      .string()
      .optional()
      .describe("Search in node content (case-insensitive)"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum results to return"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    let nodes = state.nodes;

    if (params.types && params.types.length > 0) {
      const typeSet = new Set(params.types);
      nodes = nodes.filter((n) => typeSet.has(n.type));
    }

    if (params.parentId !== undefined) {
      nodes = nodes.filter((n) => n.parentId === params.parentId);
    }

    if (params.locked !== undefined) {
      nodes = nodes.filter((n) => n.locked === params.locked);
    }

    if (params.visible !== undefined) {
      nodes = nodes.filter((n) => n.visible === params.visible);
    }

    if (params.contentContains) {
      const searchTerm = params.contentContains.toLowerCase();
      nodes = nodes.filter((n) => {
        if (typeof n.content === "string") {
          return n.content.toLowerCase().includes(searchTerm);
        }
        if (n.content && typeof n.content === "object") {
          return JSON.stringify(n.content).toLowerCase().includes(searchTerm);
        }
        return false;
      });
    }

    const limitedNodes = nodes.slice(0, params.limit);

    return success(
      {
        nodes: limitedNodes,
        totalMatches: nodes.length,
        returnedCount: limitedNodes.length,
        truncated: nodes.length > limitedNodes.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasGetSelectionTool = defineTool({
  name: "canvas_get_selection",
  description: `Get the currently selected nodes on the canvas.

USE THIS WHEN:
- User refers to "selected" or "these" nodes
- Operating on user's current selection

RETURNS: List of selected node IDs and their details.`,
  category: "canvas",
  searchKeywords: ["canvas", "selection", "selected", "current"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({}),

  async execute(_params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.getSelection)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const selectedIds = await canvasCtx.getSelection();
    const selectedIdSet = new Set(selectedIds);

    const selectedNodes = state.nodes.filter((n) => selectedIdSet.has(n.id));

    return success(
      {
        selectedIds,
        selectedNodes,
        selectionCount: selectedNodes.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasSetSelectionTool = defineTool({
  name: "canvas_set_selection",
  description: `Set the canvas selection to specific nodes.

USE THIS WHEN:
- Highlighting specific nodes for the user
- Preparing nodes for batch operations

RETURNS: The new selection state.`,
  category: "canvas",
  searchKeywords: ["canvas", "selection", "select", "highlight"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z.array(z.string()).describe("IDs of nodes to select"),
    addToSelection: z
      .boolean()
      .optional()
      .default(false)
      .describe("Add to existing selection instead of replacing"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getSelection && canvasCtx.setSelection)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    let newSelection = params.nodeIds;

    if (params.addToSelection) {
      const currentSelection = await canvasCtx.getSelection();
      const selectionSet = new Set([...currentSelection, ...params.nodeIds]);
      newSelection = Array.from(selectionSet);
    }

    await canvasCtx.setSelection(newSelection);

    return success(
      {
        selectedIds: newSelection,
        selectionCount: newSelection.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasGetNodeStatsTool = defineTool({
  name: "canvas_get_node_stats",
  description: `Get statistics about the canvas nodes.

USE THIS WHEN:
- Understanding workflow complexity
- Summarizing the agent structure
- Checking for issues

RETURNS: Node counts by type, connection statistics, and structure info.`,
  category: "canvas",
  searchKeywords: ["canvas", "stats", "statistics", "summary", "overview"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({}),

  async execute(_params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    const nodesByType = new Map<string, number>();
    for (const node of state.nodes) {
      const count = nodesByType.get(node.type) ?? 0;
      nodesByType.set(node.type, count + 1);
    }

    const nodesWithNoIncoming = state.nodes.filter(
      (n) => !state.connections.some((c) => c.targetNodeId === n.id)
    );

    const nodesWithNoOutgoing = state.nodes.filter(
      (n) => !state.connections.some((c) => c.sourceNodeId === n.id)
    );

    const lockedNodes = state.nodes.filter((n) => n.locked);
    const hiddenNodes = state.nodes.filter((n) => !n.visible);
    const groupedNodes = state.nodes.filter((n) => n.parentId);

    return success(
      {
        totalNodes: state.nodes.length,
        totalConnections: state.connections.length,
        nodesByType: Object.fromEntries(nodesByType),
        entryPoints: nodesWithNoIncoming.map((n) => n.id),
        exitPoints: nodesWithNoOutgoing.map((n) => n.id),
        lockedCount: lockedNodes.length,
        hiddenCount: hiddenNodes.length,
        groupedCount: groupedNodes.length,
      },
      { source: "canvas" }
    );
  },
});

export const queryTools = [
  canvasGetStateTool,
  canvasGetNodeTool,
  canvasQueryNodesTool,
  canvasGetSelectionTool,
  canvasSetSelectionTool,
  canvasGetNodeStatsTool,
];
