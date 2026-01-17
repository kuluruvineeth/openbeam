import { z } from "zod";
import { defineTool, failure, success } from "../../tools/builder";
import type { CanvasToolContext, NodeStyle, Position } from "../types";

const PositionSchema = z.object({
  x: z.number().describe("X coordinate on canvas"),
  y: z.number().describe("Y coordinate on canvas"),
});

const DimensionsSchema = z.object({
  width: z.number().positive().describe("Width in pixels"),
  height: z.number().positive().describe("Height in pixels"),
});

const NodeStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  textColor: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const canvasCreateNodeTool = defineTool({
  name: "canvas_create_node",
  description: `Create a new node on the canvas.

USE THIS WHEN:
- User asks to add a new node, step, or element to the agent workflow
- Building a new agent from scratch
- Adding a processing step to an existing workflow

DO NOT USE WHEN:
- Modifying an existing node (use canvas_update_node)
- Moving nodes (use canvas_move_nodes)
- Connecting nodes (use canvas_create_connection)

RETURNS: The created node with its assigned ID.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "create", "add", "new"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    type: z
      .string()
      .describe(
        "Node type: 'start', 'end', 'llm', 'rag', 'condition', 'loop', 'parallelSplit', 'parallelJoin', 'map', 'filter', 'template', 'http', 'code', 'webhook'"
      ),
    position: PositionSchema.describe("Position to place the node"),
    label: z.string().optional().describe("Display label for the node"),
    content: z
      .union([z.string(), z.record(z.string(), z.unknown())])
      .optional()
      .describe("Node content or configuration"),
    dimensions: DimensionsSchema.optional().describe("Custom dimensions"),
    style: NodeStyleSchema.optional().describe("Custom styling"),
    parentId: z.string().optional().describe("Parent node ID for grouping"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.applyPatch) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const node = {
      id: nodeId,
      type: params.type,
      position: params.position,
      dimensions: params.dimensions,
      content: params.content,
      style: params.style as NodeStyle | undefined,
      parentId: params.parentId,
      zIndex: 1,
      locked: false,
      visible: true,
    };

    await canvasCtx.applyPatch({
      operations: [
        {
          op: "add",
          path: "/nodes/-",
          value: node,
        },
      ],
      description: `Create ${params.type} node${params.label ? ` "${params.label}"` : ""}`,
    });

    return success({ node, created: true }, { source: "canvas" });
  },
});

export const canvasUpdateNodeTool = defineTool({
  name: "canvas_update_node",
  description: `Update an existing node's properties.

USE THIS WHEN:
- Changing node configuration (model, prompt, expression)
- Updating node labels or content
- Modifying node appearance or style

DO NOT USE WHEN:
- Moving nodes (use canvas_move_nodes)
- Creating new nodes (use canvas_create_node)
- Deleting nodes (use canvas_delete_nodes)

RETURNS: The updated node.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "update", "modify", "change"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeId: z.string().describe("ID of the node to update"),
    label: z.string().optional().describe("New display label"),
    content: z
      .union([z.string(), z.record(z.string(), z.unknown())])
      .optional()
      .describe("New content or configuration"),
    style: NodeStyleSchema.optional().describe("Style updates"),
    locked: z.boolean().optional().describe("Lock/unlock the node"),
    visible: z.boolean().optional().describe("Show/hide the node"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIndex = state.nodes.findIndex((n) => n.id === params.nodeId);

    if (nodeIndex === -1) {
      return failure("NOT_FOUND", `Node not found: ${params.nodeId}`);
    }

    const operations: Array<{ op: "replace"; path: string; value: unknown }> =
      [];

    if (params.label !== undefined) {
      operations.push({
        op: "replace",
        path: `/nodes/${nodeIndex}/content`,
        value:
          typeof state.nodes[nodeIndex]?.content === "object"
            ? {
                ...(state.nodes[nodeIndex]?.content as object),
                label: params.label,
              }
            : params.label,
      });
    }

    if (params.content !== undefined) {
      operations.push({
        op: "replace",
        path: `/nodes/${nodeIndex}/content`,
        value: params.content,
      });
    }

    if (params.style !== undefined) {
      operations.push({
        op: "replace",
        path: `/nodes/${nodeIndex}/style`,
        value: { ...state.nodes[nodeIndex]?.style, ...params.style },
      });
    }

    if (params.locked !== undefined) {
      operations.push({
        op: "replace",
        path: `/nodes/${nodeIndex}/locked`,
        value: params.locked,
      });
    }

    if (params.visible !== undefined) {
      operations.push({
        op: "replace",
        path: `/nodes/${nodeIndex}/visible`,
        value: params.visible,
      });
    }

    if (operations.length === 0) {
      return failure("INVALID_INPUT", "No updates specified");
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Update node ${params.nodeId}`,
    });

    const updatedState = await canvasCtx.getState();
    const updatedNode = updatedState.nodes.find((n) => n.id === params.nodeId);

    return success({ node: updatedNode, updated: true }, { source: "canvas" });
  },
});

export const canvasDeleteNodesTool = defineTool({
  name: "canvas_delete_nodes",
  description: `Delete one or more nodes from the canvas.

USE THIS WHEN:
- Removing unwanted nodes from the workflow
- Cleaning up a workflow
- User explicitly asks to delete nodes

DO NOT USE WHEN:
- Hiding nodes temporarily (use canvas_update_node with visible: false)
- Moving nodes (use canvas_move_nodes)

RETURNS: List of deleted node IDs and count of removed connections.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "delete", "remove"],
  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z.array(z.string()).min(1).describe("IDs of nodes to delete"),
    deleteConnections: z
      .boolean()
      .optional()
      .default(true)
      .describe("Also delete connections involving these nodes"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIdSet = new Set(params.nodeIds);

    const nodesToDelete = state.nodes.filter((n) => nodeIdSet.has(n.id));
    if (nodesToDelete.length === 0) {
      return failure("NOT_FOUND", "No matching nodes found");
    }

    const operations: Array<{ op: "remove"; path: string }> = [];

    const nodeIndicesToRemove = state.nodes
      .map((n, i) => (nodeIdSet.has(n.id) ? i : -1))
      .filter((i) => i !== -1)
      .sort((a, b) => b - a);

    for (const index of nodeIndicesToRemove) {
      operations.push({ op: "remove", path: `/nodes/${index}` });
    }

    let removedConnections = 0;
    if (params.deleteConnections) {
      const connectionIndicesToRemove = state.connections
        .map((c, i) =>
          nodeIdSet.has(c.sourceNodeId) || nodeIdSet.has(c.targetNodeId)
            ? i
            : -1
        )
        .filter((i) => i !== -1)
        .sort((a, b) => b - a);

      for (const index of connectionIndicesToRemove) {
        operations.push({ op: "remove", path: `/connections/${index}` });
      }
      removedConnections = connectionIndicesToRemove.length;
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Delete ${nodesToDelete.length} node(s)`,
    });

    return success(
      {
        deletedNodeIds: nodesToDelete.map((n) => n.id),
        deletedCount: nodesToDelete.length,
        removedConnections,
      },
      { source: "canvas" }
    );
  },
});

export const canvasMoveNodesTool = defineTool({
  name: "canvas_move_nodes",
  description: `Move one or more nodes to new positions.

USE THIS WHEN:
- Repositioning nodes for better layout
- Aligning nodes
- User drags or asks to move nodes

DO NOT USE WHEN:
- Nodes are locked
- Changing node properties (use canvas_update_node)

RETURNS: Updated positions for all moved nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "move", "position", "drag"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    moves: z
      .array(
        z.object({
          nodeId: z.string().describe("ID of node to move"),
          position: PositionSchema.describe("New position"),
        })
      )
      .min(1)
      .describe("List of node movements"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeMap = new Map(
      state.nodes.map((n, i) => [n.id, { node: n, index: i }])
    );

    const operations: Array<{ op: "replace"; path: string; value: Position }> =
      [];
    const movedNodes: Array<{ nodeId: string; position: Position }> = [];

    for (const move of params.moves) {
      const entry = nodeMap.get(move.nodeId);
      if (!entry) {
        continue;
      }

      if (entry.node.locked) {
        continue;
      }

      operations.push({
        op: "replace",
        path: `/nodes/${entry.index}/position`,
        value: move.position,
      });
      movedNodes.push({ nodeId: move.nodeId, position: move.position });
    }

    if (operations.length === 0) {
      return failure(
        "INVALID_INPUT",
        "No nodes could be moved (not found or locked)"
      );
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Move ${movedNodes.length} node(s)`,
    });

    return success(
      { movedNodes, movedCount: movedNodes.length },
      { source: "canvas" }
    );
  },
});

export const canvasDuplicateNodesTool = defineTool({
  name: "canvas_duplicate_nodes",
  description: `Duplicate one or more nodes with optional offset.

USE THIS WHEN:
- Creating copies of existing nodes
- User wants to reuse a node configuration
- Building similar workflow branches

DO NOT USE WHEN:
- Creating new nodes from scratch (use canvas_create_node)

RETURNS: Mapping of original node IDs to new duplicate IDs.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "duplicate", "copy", "clone"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z.array(z.string()).min(1).describe("IDs of nodes to duplicate"),
    offset: PositionSchema.optional()
      .default({ x: 50, y: 50 })
      .describe("Position offset for duplicates"),
    includeConnections: z
      .boolean()
      .optional()
      .default(false)
      .describe("Also duplicate connections between selected nodes"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIdSet = new Set(params.nodeIds);
    const nodesToDuplicate = state.nodes.filter((n) => nodeIdSet.has(n.id));

    if (nodesToDuplicate.length === 0) {
      return failure("NOT_FOUND", "No matching nodes found");
    }

    const idMapping = new Map<string, string>();
    const operations: Array<{ op: "add"; path: string; value: unknown }> = [];
    const offset = params.offset ?? { x: 50, y: 50 };

    for (const node of nodesToDuplicate) {
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      idMapping.set(node.id, newId);

      const duplicatedNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        locked: false,
      };

      operations.push({
        op: "add",
        path: "/nodes/-",
        value: duplicatedNode,
      });
    }

    if (params.includeConnections) {
      const connectionsToDuplicate = state.connections.filter(
        (c) => nodeIdSet.has(c.sourceNodeId) && nodeIdSet.has(c.targetNodeId)
      );

      for (const conn of connectionsToDuplicate) {
        const newSourceId = idMapping.get(conn.sourceNodeId);
        const newTargetId = idMapping.get(conn.targetNodeId);

        if (newSourceId && newTargetId) {
          operations.push({
            op: "add",
            path: "/connections/-",
            value: {
              ...conn,
              id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              sourceNodeId: newSourceId,
              targetNodeId: newTargetId,
            },
          });
        }
      }
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Duplicate ${nodesToDuplicate.length} node(s)`,
    });

    return success(
      {
        idMapping: Object.fromEntries(idMapping),
        duplicatedCount: nodesToDuplicate.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasGroupNodesTool = defineTool({
  name: "canvas_group_nodes",
  description: `Group nodes together into a frame or group node.

USE THIS WHEN:
- Organizing related nodes together
- Creating reusable sub-workflows
- User wants to visually group elements

DO NOT USE WHEN:
- Nodes are already in different groups

RETURNS: The created group node and updated child nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "group", "frame", "organize"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z
      .array(z.string())
      .min(2)
      .describe("IDs of nodes to group together"),
    groupType: z
      .enum(["frame", "group"])
      .optional()
      .default("frame")
      .describe("Type of grouping"),
    label: z.string().optional().describe("Label for the group"),
    padding: z
      .number()
      .optional()
      .default(20)
      .describe("Padding around grouped nodes"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIdSet = new Set(params.nodeIds);
    const nodesToGroup = state.nodes.filter((n) => nodeIdSet.has(n.id));

    if (nodesToGroup.length < 2) {
      return failure("INVALID_INPUT", "Need at least 2 nodes to group");
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of nodesToGroup) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + (node.dimensions?.width ?? 150));
      maxY = Math.max(maxY, node.position.y + (node.dimensions?.height ?? 50));
    }

    const padding = params.padding ?? 20;
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const groupNode = {
      id: groupId,
      type: params.groupType,
      position: { x: minX - padding, y: minY - padding },
      dimensions: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      },
      content: params.label,
      zIndex: 0,
      locked: false,
      visible: true,
    };

    const operations: Array<
      | { op: "add"; path: string; value: unknown }
      | { op: "replace"; path: string; value: unknown }
    > = [{ op: "add", path: "/nodes/-", value: groupNode }];

    for (const node of nodesToGroup) {
      const nodeIndex = state.nodes.findIndex((n) => n.id === node.id);
      if (nodeIndex !== -1) {
        operations.push({
          op: "replace",
          path: `/nodes/${nodeIndex}/parentId`,
          value: groupId,
        });
      }
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Group ${nodesToGroup.length} nodes`,
    });

    return success(
      {
        groupId,
        groupedNodeIds: nodesToGroup.map((n) => n.id),
        groupBounds: {
          x: minX - padding,
          y: minY - padding,
          width: maxX - minX + padding * 2,
          height: maxY - minY + padding * 2,
        },
      },
      { source: "canvas" }
    );
  },
});

export const canvasUngroupNodesTool = defineTool({
  name: "canvas_ungroup_nodes",
  description: `Ungroup nodes from a frame or group.

USE THIS WHEN:
- Dissolving a group
- Reorganizing workflow structure

RETURNS: List of ungrouped node IDs.`,
  category: "canvas",
  searchKeywords: ["canvas", "node", "ungroup", "dissolve"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    groupId: z.string().describe("ID of the group node to dissolve"),
    deleteGroup: z
      .boolean()
      .optional()
      .default(true)
      .describe("Delete the group node after ungrouping"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const groupNode = state.nodes.find((n) => n.id === params.groupId);

    if (!groupNode) {
      return failure("NOT_FOUND", `Group not found: ${params.groupId}`);
    }

    if (groupNode.type !== "frame" && groupNode.type !== "group") {
      return failure("INVALID_INPUT", "Node is not a group or frame");
    }

    const childNodes = state.nodes.filter((n) => n.parentId === params.groupId);

    const operations: Array<
      | { op: "replace"; path: string; value: unknown }
      | { op: "remove"; path: string }
    > = [];

    for (const child of childNodes) {
      const childIndex = state.nodes.findIndex((n) => n.id === child.id);
      if (childIndex !== -1) {
        operations.push({
          op: "replace",
          path: `/nodes/${childIndex}/parentId`,
          value: undefined,
        });
      }
    }

    if (params.deleteGroup) {
      const groupIndex = state.nodes.findIndex((n) => n.id === params.groupId);
      if (groupIndex !== -1) {
        operations.push({ op: "remove", path: `/nodes/${groupIndex}` });
      }
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Ungroup ${childNodes.length} nodes`,
    });

    return success(
      {
        ungroupedNodeIds: childNodes.map((n) => n.id),
        groupDeleted: params.deleteGroup,
      },
      { source: "canvas" }
    );
  },
});

export const nodeTools = [
  canvasCreateNodeTool,
  canvasUpdateNodeTool,
  canvasDeleteNodesTool,
  canvasMoveNodesTool,
  canvasDuplicateNodesTool,
  canvasGroupNodesTool,
  canvasUngroupNodesTool,
];
