import { z } from "zod";
import { defineTool, failure, success } from "../../tools/builder";
import type {
  CanvasToolContext,
  ConnectionStyle,
  ConnectionType,
} from "../types";

const ConnectionStyleSchema = z.object({
  color: z.string().optional(),
  width: z.number().optional(),
  dashArray: z.array(z.number()).optional(),
  startMarker: z.enum(["none", "arrow", "circle", "square"]).optional(),
  endMarker: z.enum(["none", "arrow", "circle", "square"]).optional(),
  curvature: z.number().optional(),
});

export const canvasCreateConnectionTool = defineTool({
  name: "canvas_create_connection",
  description: `Create a connection (edge) between two nodes.

USE THIS WHEN:
- Connecting nodes in the workflow
- Building data flow between processing steps
- User asks to link or connect nodes

DO NOT USE WHEN:
- Nodes don't exist (create them first)
- Connection would create a cycle (unless it's intentional for loops)

RETURNS: The created connection with its ID.`,
  category: "canvas",
  searchKeywords: ["canvas", "connection", "edge", "link", "connect"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    sourceNodeId: z.string().describe("ID of the source node"),
    targetNodeId: z.string().describe("ID of the target node"),
    sourceHandle: z
      .string()
      .optional()
      .describe(
        "Handle on source node (e.g., 'true', 'false', 'body', 'output')"
      ),
    targetHandle: z
      .string()
      .optional()
      .describe("Handle on target node (e.g., 'input')"),
    type: z
      .enum(["line", "arrow", "curve", "elbow", "custom"])
      .optional()
      .default("arrow")
      .describe("Connection visual type"),
    label: z.string().optional().describe("Label to display on the connection"),
    style: ConnectionStyleSchema.optional().describe("Custom styling"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    const sourceNode = state.nodes.find((n) => n.id === params.sourceNodeId);
    const targetNode = state.nodes.find((n) => n.id === params.targetNodeId);

    if (!sourceNode) {
      return failure(
        "NOT_FOUND",
        `Source node not found: ${params.sourceNodeId}`
      );
    }

    if (!targetNode) {
      return failure(
        "NOT_FOUND",
        `Target node not found: ${params.targetNodeId}`
      );
    }

    const existingConnection = state.connections.find(
      (c) =>
        c.sourceNodeId === params.sourceNodeId &&
        c.targetNodeId === params.targetNodeId &&
        c.sourceHandle === params.sourceHandle &&
        c.targetHandle === params.targetHandle
    );

    if (existingConnection) {
      return failure(
        "INVALID_INPUT",
        "Connection already exists between these nodes with same handles"
      );
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const connection = {
      id: connectionId,
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: (params.type ?? "arrow") as ConnectionType,
      label: params.label,
      style: params.style as ConnectionStyle | undefined,
    };

    await canvasCtx.applyPatch({
      operations: [
        {
          op: "add",
          path: "/connections/-",
          value: connection,
        },
      ],
      description: `Connect ${sourceNode.type} to ${targetNode.type}`,
    });

    return success({ connection, created: true }, { source: "canvas" });
  },
});

export const canvasUpdateConnectionTool = defineTool({
  name: "canvas_update_connection",
  description: `Update an existing connection's properties.

USE THIS WHEN:
- Changing connection labels
- Modifying connection appearance
- Updating connection type

DO NOT USE WHEN:
- Changing connected nodes (delete and recreate)

RETURNS: The updated connection.`,
  category: "canvas",
  searchKeywords: ["canvas", "connection", "edge", "update", "modify"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    connectionId: z.string().describe("ID of the connection to update"),
    type: z
      .enum(["line", "arrow", "curve", "elbow", "custom"])
      .optional()
      .describe("New connection type"),
    label: z.string().optional().describe("New label"),
    style: ConnectionStyleSchema.optional().describe("Style updates"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const connectionIndex = state.connections.findIndex(
      (c) => c.id === params.connectionId
    );

    if (connectionIndex === -1) {
      return failure(
        "NOT_FOUND",
        `Connection not found: ${params.connectionId}`
      );
    }

    const operations: Array<{ op: "replace"; path: string; value: unknown }> =
      [];

    if (params.type !== undefined) {
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/type`,
        value: params.type,
      });
    }

    if (params.label !== undefined) {
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/label`,
        value: params.label,
      });
    }

    if (params.style !== undefined) {
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/style`,
        value: {
          ...state.connections[connectionIndex]?.style,
          ...params.style,
        },
      });
    }

    if (operations.length === 0) {
      return failure("INVALID_INPUT", "No updates specified");
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Update connection ${params.connectionId}`,
    });

    const updatedState = await canvasCtx.getState();
    const updatedConnection = updatedState.connections.find(
      (c) => c.id === params.connectionId
    );

    return success(
      { connection: updatedConnection, updated: true },
      { source: "canvas" }
    );
  },
});

export const canvasDeleteConnectionsTool = defineTool({
  name: "canvas_delete_connections",
  description: `Delete one or more connections from the canvas.

USE THIS WHEN:
- Removing unwanted connections
- Restructuring the workflow
- User asks to disconnect nodes

RETURNS: List of deleted connection IDs.`,
  category: "canvas",
  searchKeywords: [
    "canvas",
    "connection",
    "edge",
    "delete",
    "remove",
    "disconnect",
  ],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    connectionIds: z
      .array(z.string())
      .min(1)
      .describe("IDs of connections to delete"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const connectionIdSet = new Set(params.connectionIds);

    const connectionsToDelete = state.connections.filter((c) =>
      connectionIdSet.has(c.id)
    );

    if (connectionsToDelete.length === 0) {
      return failure("NOT_FOUND", "No matching connections found");
    }

    const indicesToRemove = state.connections
      .map((c, i) => (connectionIdSet.has(c.id) ? i : -1))
      .filter((i) => i !== -1)
      .sort((a, b) => b - a);

    const operations = indicesToRemove.map((index) => ({
      op: "remove" as const,
      path: `/connections/${index}`,
    }));

    await canvasCtx.applyPatch({
      operations,
      description: `Delete ${connectionsToDelete.length} connection(s)`,
    });

    return success(
      {
        deletedConnectionIds: connectionsToDelete.map((c) => c.id),
        deletedCount: connectionsToDelete.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasReconnectTool = defineTool({
  name: "canvas_reconnect",
  description: `Change the source or target of an existing connection.

USE THIS WHEN:
- Moving a connection to a different node
- Changing which handle a connection uses

RETURNS: The updated connection.`,
  category: "canvas",
  searchKeywords: ["canvas", "connection", "reconnect", "rewire"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    connectionId: z.string().describe("ID of the connection to modify"),
    newSourceNodeId: z.string().optional().describe("New source node ID"),
    newTargetNodeId: z.string().optional().describe("New target node ID"),
    newSourceHandle: z.string().optional().describe("New source handle"),
    newTargetHandle: z.string().optional().describe("New target handle"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const connectionIndex = state.connections.findIndex(
      (c) => c.id === params.connectionId
    );

    if (connectionIndex === -1) {
      return failure(
        "NOT_FOUND",
        `Connection not found: ${params.connectionId}`
      );
    }

    const operations: Array<{ op: "replace"; path: string; value: unknown }> =
      [];

    if (params.newSourceNodeId !== undefined) {
      const sourceExists = state.nodes.some(
        (n) => n.id === params.newSourceNodeId
      );
      if (!sourceExists) {
        return failure(
          "NOT_FOUND",
          `Source node not found: ${params.newSourceNodeId}`
        );
      }
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/sourceNodeId`,
        value: params.newSourceNodeId,
      });
    }

    if (params.newTargetNodeId !== undefined) {
      const targetExists = state.nodes.some(
        (n) => n.id === params.newTargetNodeId
      );
      if (!targetExists) {
        return failure(
          "NOT_FOUND",
          `Target node not found: ${params.newTargetNodeId}`
        );
      }
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/targetNodeId`,
        value: params.newTargetNodeId,
      });
    }

    if (params.newSourceHandle !== undefined) {
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/sourceHandle`,
        value: params.newSourceHandle,
      });
    }

    if (params.newTargetHandle !== undefined) {
      operations.push({
        op: "replace",
        path: `/connections/${connectionIndex}/targetHandle`,
        value: params.newTargetHandle,
      });
    }

    if (operations.length === 0) {
      return failure("INVALID_INPUT", "No changes specified");
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Reconnect ${params.connectionId}`,
    });

    const updatedState = await canvasCtx.getState();
    const updatedConnection = updatedState.connections.find(
      (c) => c.id === params.connectionId
    );

    return success(
      { connection: updatedConnection, reconnected: true },
      { source: "canvas" }
    );
  },
});

export const canvasFindPathTool = defineTool({
  name: "canvas_find_path",
  description: `Find the path between two nodes in the workflow.

USE THIS WHEN:
- Checking if two nodes are connected
- Understanding data flow between nodes
- Analyzing workflow structure

RETURNS: Array of node IDs representing the path, or empty if no path exists.`,
  category: "canvas",
  searchKeywords: ["canvas", "path", "route", "flow", "trace"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    fromNodeId: z.string().describe("Starting node ID"),
    toNodeId: z.string().describe("Target node ID"),
    maxDepth: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum path length to search"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    const fromNode = state.nodes.find((n) => n.id === params.fromNodeId);
    const toNode = state.nodes.find((n) => n.id === params.toNodeId);

    if (!fromNode) {
      return failure("NOT_FOUND", `From node not found: ${params.fromNodeId}`);
    }

    if (!toNode) {
      return failure("NOT_FOUND", `To node not found: ${params.toNodeId}`);
    }

    const adjacencyMap = new Map<string, string[]>();
    for (const conn of state.connections) {
      const targets = adjacencyMap.get(conn.sourceNodeId) ?? [];
      targets.push(conn.targetNodeId);
      adjacencyMap.set(conn.sourceNodeId, targets);
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: params.fromNodeId, path: [params.fromNodeId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      if (current.nodeId === params.toNodeId) {
        return success(
          {
            path: current.path,
            found: true,
            length: current.path.length,
          },
          { source: "canvas" }
        );
      }

      if (
        visited.has(current.nodeId) ||
        current.path.length > params.maxDepth
      ) {
        continue;
      }

      visited.add(current.nodeId);

      const neighbors = adjacencyMap.get(current.nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({
            nodeId: neighbor,
            path: [...current.path, neighbor],
          });
        }
      }
    }

    return success(
      {
        path: [],
        found: false,
        length: 0,
      },
      { source: "canvas" }
    );
  },
});

export const connectionTools = [
  canvasCreateConnectionTool,
  canvasUpdateConnectionTool,
  canvasDeleteConnectionsTool,
  canvasReconnectTool,
  canvasFindPathTool,
];
