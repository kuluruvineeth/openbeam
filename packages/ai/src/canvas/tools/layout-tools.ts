import { z } from "zod";
import { defineTool, failure, success } from "../../tools/builder";
import type {
  CanvasNode,
  CanvasToolContext,
  LayoutAlgorithm,
  Position,
} from "../types";

const LayoutAlgorithmSchema = z.enum([
  "grid",
  "tree",
  "force",
  "radial",
  "horizontal",
  "vertical",
  "circular",
]);

export const canvasAutoLayoutTool = defineTool({
  name: "canvas_auto_layout",
  description: `Automatically arrange nodes using a layout algorithm.

USE THIS WHEN:
- Organizing a messy canvas
- User asks to "clean up" or "organize" the layout
- After adding multiple nodes

AVAILABLE ALGORITHMS:
- grid: Arrange in a regular grid pattern
- tree: Hierarchical tree layout (for workflows)
- horizontal: Left-to-right flow
- vertical: Top-to-bottom flow
- circular: Arrange in a circle
- radial: Radiate from center
- force: Force-directed graph layout

RETURNS: New positions for all affected nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "layout", "arrange", "organize", "auto"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    algorithm: LayoutAlgorithmSchema.describe("Layout algorithm to use"),
    nodeIds: z
      .array(z.string())
      .optional()
      .describe("Specific nodes to layout (default: all)"),
    spacing: z
      .number()
      .optional()
      .default(100)
      .describe("Spacing between nodes in pixels"),
    centerX: z.number().optional().describe("Center X coordinate for layout"),
    centerY: z.number().optional().describe("Center Y coordinate for layout"),
    direction: z
      .enum(["LR", "RL", "TB", "BT"])
      .optional()
      .default("LR")
      .describe("Direction for tree/flow layouts"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    let nodesToLayout: CanvasNode[];
    if (params.nodeIds && params.nodeIds.length > 0) {
      const nodeIdSet = new Set(params.nodeIds);
      nodesToLayout = state.nodes.filter(
        (n) => nodeIdSet.has(n.id) && !n.locked
      );
    } else {
      nodesToLayout = state.nodes.filter((n) => !n.locked);
    }

    if (nodesToLayout.length === 0) {
      return failure("INVALID_INPUT", "No unlocked nodes to layout");
    }

    const centerX = params.centerX ?? 400;
    const centerY = params.centerY ?? 300;
    const spacing = params.spacing ?? 100;

    const newPositions = calculateLayout({
      algorithm: params.algorithm,
      nodes: nodesToLayout,
      connections: state.connections,
      spacing,
      centerX,
      centerY,
      direction: params.direction ?? "LR",
    });

    const operations = nodesToLayout.map((node, i) => {
      const nodeIndex = state.nodes.findIndex((n) => n.id === node.id);
      const position = newPositions[i];
      return {
        op: "replace" as const,
        path: `/nodes/${nodeIndex}/position`,
        value: position,
      };
    });

    await canvasCtx.applyPatch({
      operations,
      description: `Auto layout: ${params.algorithm}`,
    });

    return success(
      {
        layoutApplied: params.algorithm,
        nodesAffected: nodesToLayout.length,
        newPositions: nodesToLayout.map((n, i) => ({
          nodeId: n.id,
          position: newPositions[i],
        })),
      },
      { source: "canvas" }
    );
  },
});

function calculateLayout(options: {
  algorithm: LayoutAlgorithm;
  nodes: CanvasNode[];
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>;
  spacing: number;
  centerX: number;
  centerY: number;
  direction: "LR" | "RL" | "TB" | "BT";
}): Position[] {
  const { algorithm, nodes, spacing, centerX, centerY } = options;

  switch (algorithm) {
    case "grid":
      return gridLayout(nodes, spacing, centerX, centerY);
    case "horizontal":
      return horizontalLayout(
        nodes,
        options.connections,
        spacing,
        centerX,
        centerY
      );
    case "vertical":
      return verticalLayout(
        nodes,
        options.connections,
        spacing,
        centerX,
        centerY
      );
    case "circular":
      return circularLayout(nodes, spacing, centerX, centerY);
    case "radial":
      return radialLayout(
        nodes,
        options.connections,
        spacing,
        centerX,
        centerY
      );
    case "tree":
      return treeLayout(
        nodes,
        options.connections,
        spacing,
        centerX,
        centerY,
        options.direction
      );
    case "force":
      return forceLayout(nodes, options.connections, spacing, centerX, centerY);
    default:
      return gridLayout(nodes, spacing, centerX, centerY);
  }
}

function gridLayout(
  nodes: CanvasNode[],
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const totalWidth = (cols - 1) * spacing;
  const totalHeight = (Math.ceil(nodes.length / cols) - 1) * spacing;
  const startX = centerX - totalWidth / 2;
  const startY = centerY - totalHeight / 2;

  return nodes.map((_, i) => ({
    x: startX + (i % cols) * spacing,
    y: startY + Math.floor(i / cols) * spacing,
  }));
}

// biome-ignore lint/nursery/useMaxParams: Layout algorithm requires multiple parameters
function horizontalLayout(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>,
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const levels = computeLevels(nodes, connections);
  const maxLevel = Math.max(...levels.values(), 0);
  const totalWidth = maxLevel * spacing;
  const startX = centerX - totalWidth / 2;

  const levelNodes = new Map<number, CanvasNode[]>();
  for (const [nodeId, level] of levels) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const existing = levelNodes.get(level) ?? [];
      existing.push(node);
      levelNodes.set(level, existing);
    }
  }

  const positions = new Map<string, Position>();
  for (const [level, nodesAtLevel] of levelNodes) {
    const levelHeight = (nodesAtLevel.length - 1) * (spacing * 0.6);
    const levelStartY = centerY - levelHeight / 2;

    for (let i = 0; i < nodesAtLevel.length; i++) {
      const node = nodesAtLevel[i];
      if (node) {
        positions.set(node.id, {
          x: startX + level * spacing,
          y: levelStartY + i * (spacing * 0.6),
        });
      }
    }
  }

  return nodes.map((n) => positions.get(n.id) ?? { x: centerX, y: centerY });
}

// biome-ignore lint/nursery/useMaxParams: Layout algorithm requires multiple parameters
function verticalLayout(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>,
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const levels = computeLevels(nodes, connections);
  const maxLevel = Math.max(...levels.values(), 0);
  const totalHeight = maxLevel * spacing;
  const startY = centerY - totalHeight / 2;

  const levelNodes = new Map<number, CanvasNode[]>();
  for (const [nodeId, level] of levels) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const existing = levelNodes.get(level) ?? [];
      existing.push(node);
      levelNodes.set(level, existing);
    }
  }

  const positions = new Map<string, Position>();
  for (const [level, nodesAtLevel] of levelNodes) {
    const levelWidth = (nodesAtLevel.length - 1) * (spacing * 0.8);
    const levelStartX = centerX - levelWidth / 2;

    for (let i = 0; i < nodesAtLevel.length; i++) {
      const node = nodesAtLevel[i];
      if (node) {
        positions.set(node.id, {
          x: levelStartX + i * (spacing * 0.8),
          y: startY + level * spacing,
        });
      }
    }
  }

  return nodes.map((n) => positions.get(n.id) ?? { x: centerX, y: centerY });
}

function circularLayout(
  nodes: CanvasNode[],
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const radius = Math.max(spacing, (nodes.length * spacing) / (2 * Math.PI));

  return nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

// biome-ignore lint/nursery/useMaxParams: Layout algorithm requires multiple parameters
function radialLayout(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>,
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const levels = computeLevels(nodes, connections);
  const levelNodes = new Map<number, CanvasNode[]>();

  for (const [nodeId, level] of levels) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const existing = levelNodes.get(level) ?? [];
      existing.push(node);
      levelNodes.set(level, existing);
    }
  }

  const positions = new Map<string, Position>();

  for (const [level, nodesAtLevel] of levelNodes) {
    const radius = level * spacing;

    if (level === 0) {
      for (const node of nodesAtLevel) {
        positions.set(node.id, { x: centerX, y: centerY });
      }
    } else {
      for (let i = 0; i < nodesAtLevel.length; i++) {
        const node = nodesAtLevel[i];
        if (node) {
          const angle = (2 * Math.PI * i) / nodesAtLevel.length - Math.PI / 2;
          positions.set(node.id, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
      }
    }
  }

  return nodes.map((n) => positions.get(n.id) ?? { x: centerX, y: centerY });
}

// biome-ignore lint/nursery/useMaxParams: Tree layout requires direction parameter
function treeLayout(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>,
  spacing: number,
  centerX: number,
  centerY: number,
  direction: "LR" | "RL" | "TB" | "BT"
): Position[] {
  const levels = computeLevels(nodes, connections);
  const maxLevel = Math.max(...levels.values(), 0);
  const levelNodes = new Map<number, CanvasNode[]>();

  for (const [nodeId, level] of levels) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const existing = levelNodes.get(level) ?? [];
      existing.push(node);
      levelNodes.set(level, existing);
    }
  }

  const positions = new Map<string, Position>();
  const isHorizontal = direction === "LR" || direction === "RL";
  const isReversed = direction === "RL" || direction === "BT";

  for (const [level, nodesAtLevel] of levelNodes) {
    const adjustedLevel = isReversed ? maxLevel - level : level;

    if (isHorizontal) {
      const levelHeight = (nodesAtLevel.length - 1) * (spacing * 0.6);
      const levelStartY = centerY - levelHeight / 2;
      const x = centerX - (maxLevel * spacing) / 2 + adjustedLevel * spacing;

      for (let i = 0; i < nodesAtLevel.length; i++) {
        const node = nodesAtLevel[i];
        if (node) {
          positions.set(node.id, {
            x,
            y: levelStartY + i * (spacing * 0.6),
          });
        }
      }
    } else {
      const levelWidth = (nodesAtLevel.length - 1) * (spacing * 0.8);
      const levelStartX = centerX - levelWidth / 2;
      const y = centerY - (maxLevel * spacing) / 2 + adjustedLevel * spacing;

      for (let i = 0; i < nodesAtLevel.length; i++) {
        const node = nodesAtLevel[i];
        if (node) {
          positions.set(node.id, {
            x: levelStartX + i * (spacing * 0.8),
            y,
          });
        }
      }
    }
  }

  return nodes.map((n) => positions.get(n.id) ?? { x: centerX, y: centerY });
}

// biome-ignore lint/nursery/useMaxParams: Force layout requires multiple parameters
function forceLayout(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>,
  spacing: number,
  centerX: number,
  centerY: number
): Position[] {
  const positions = new Map<string, Position>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node) {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = spacing * 2;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
  }

  const iterations = 50;
  const repulsion = spacing * spacing;
  const attraction = 0.1;
  const damping = 0.9;

  const velocities = new Map<string, { vx: number; vy: number }>();
  for (const n of nodes) {
    velocities.set(n.id, { vx: 0, vy: 0 });
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (const node of nodes) {
      const pos = positions.get(node.id);
      const vel = velocities.get(node.id);
      if (!(pos && vel)) {
        continue;
      }

      let fx = 0;
      let fy = 0;

      for (const other of nodes) {
        if (other.id === node.id) {
          continue;
        }
        const otherPos = positions.get(other.id);
        if (!otherPos) {
          continue;
        }

        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);

        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      for (const conn of connections) {
        let otherId: string | null = null;
        if (conn.sourceNodeId === node.id) {
          otherId = conn.targetNodeId;
        } else if (conn.targetNodeId === node.id) {
          otherId = conn.sourceNodeId;
        }

        if (!otherId) {
          continue;
        }

        const otherPos = positions.get(otherId);
        if (!otherPos) {
          continue;
        }

        const dx = otherPos.x - pos.x;
        const dy = otherPos.y - pos.y;

        fx += dx * attraction;
        fy += dy * attraction;
      }

      fx += (centerX - pos.x) * 0.01;
      fy += (centerY - pos.y) * 0.01;

      vel.vx = (vel.vx + fx) * damping;
      vel.vy = (vel.vy + fy) * damping;

      positions.set(node.id, {
        x: pos.x + vel.vx,
        y: pos.y + vel.vy,
      });
    }
  }

  return nodes.map((n) => positions.get(n.id) ?? { x: centerX, y: centerY });
}

function computeLevels(
  nodes: CanvasNode[],
  connections: Array<{ sourceNodeId: string; targetNodeId: string }>
): Map<string, number> {
  const levels = new Map<string, number>();
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = new Map<string, string[]>();

  for (const conn of connections) {
    if (nodeIds.has(conn.sourceNodeId) && nodeIds.has(conn.targetNodeId)) {
      const targets = adjacency.get(conn.sourceNodeId) ?? [];
      targets.push(conn.targetNodeId);
      adjacency.set(conn.sourceNodeId, targets);
    }
  }

  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
  }

  for (const conn of connections) {
    if (nodeIds.has(conn.sourceNodeId) && nodeIds.has(conn.targetNodeId)) {
      inDegree.set(
        conn.targetNodeId,
        (inDegree.get(conn.targetNodeId) ?? 0) + 1
      );
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const currentLevel = levels.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];

    for (const neighbor of neighbors) {
      const newLevel = currentLevel + 1;
      const existingLevel = levels.get(neighbor);

      if (existingLevel === undefined || newLevel > existingLevel) {
        levels.set(neighbor, newLevel);
      }

      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  for (const id of nodeIds) {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  }

  return levels;
}

export const canvasAlignNodesTool = defineTool({
  name: "canvas_align_nodes",
  description: `Align selected nodes along an axis.

USE THIS WHEN:
- Making nodes line up neatly
- User asks to align nodes

RETURNS: New positions for aligned nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "align", "nodes", "line up"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z.array(z.string()).min(2).describe("IDs of nodes to align"),
    alignment: z
      .enum(["left", "center", "right", "top", "middle", "bottom"])
      .describe("Alignment direction"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIdSet = new Set(params.nodeIds);
    const nodesToAlign = state.nodes.filter(
      (n) => nodeIdSet.has(n.id) && !n.locked
    );

    if (nodesToAlign.length < 2) {
      return failure(
        "INVALID_INPUT",
        "Need at least 2 unlocked nodes to align"
      );
    }

    let alignValue: number;

    switch (params.alignment) {
      case "left":
        alignValue = Math.min(...nodesToAlign.map((n) => n.position.x));
        break;
      case "right":
        alignValue = Math.max(
          ...nodesToAlign.map(
            (n) => n.position.x + (n.dimensions?.width ?? 150)
          )
        );
        break;
      case "center": {
        const centerXValues = nodesToAlign.map(
          (n) => n.position.x + (n.dimensions?.width ?? 150) / 2
        );
        alignValue =
          centerXValues.reduce((a, b) => a + b, 0) / centerXValues.length;
        break;
      }
      case "top":
        alignValue = Math.min(...nodesToAlign.map((n) => n.position.y));
        break;
      case "bottom":
        alignValue = Math.max(
          ...nodesToAlign.map(
            (n) => n.position.y + (n.dimensions?.height ?? 50)
          )
        );
        break;
      case "middle": {
        const centerYValues = nodesToAlign.map(
          (n) => n.position.y + (n.dimensions?.height ?? 50) / 2
        );
        alignValue =
          centerYValues.reduce((a, b) => a + b, 0) / centerYValues.length;
        break;
      }
      default:
        alignValue = Math.min(...nodesToAlign.map((n) => n.position.x));
    }

    const operations = nodesToAlign.map((node) => {
      const nodeIndex = state.nodes.findIndex((n) => n.id === node.id);
      let newPosition: Position;

      switch (params.alignment) {
        case "left":
          newPosition = { x: alignValue, y: node.position.y };
          break;
        case "right":
          newPosition = {
            x: alignValue - (node.dimensions?.width ?? 150),
            y: node.position.y,
          };
          break;
        case "center":
          newPosition = {
            x: alignValue - (node.dimensions?.width ?? 150) / 2,
            y: node.position.y,
          };
          break;
        case "top":
          newPosition = { x: node.position.x, y: alignValue };
          break;
        case "bottom":
          newPosition = {
            x: node.position.x,
            y: alignValue - (node.dimensions?.height ?? 50),
          };
          break;
        case "middle":
          newPosition = {
            x: node.position.x,
            y: alignValue - (node.dimensions?.height ?? 50) / 2,
          };
          break;
        default:
          newPosition = { x: alignValue, y: node.position.y };
      }

      return {
        op: "replace" as const,
        path: `/nodes/${nodeIndex}/position`,
        value: newPosition,
      };
    });

    await canvasCtx.applyPatch({
      operations,
      description: `Align nodes: ${params.alignment}`,
    });

    return success(
      {
        alignedCount: nodesToAlign.length,
        alignment: params.alignment,
      },
      { source: "canvas" }
    );
  },
});

export const canvasDistributeNodesTool = defineTool({
  name: "canvas_distribute_nodes",
  description: `Distribute nodes evenly along an axis.

USE THIS WHEN:
- Spacing nodes evenly
- User asks to distribute or space out nodes

RETURNS: New positions for distributed nodes.`,
  category: "canvas",
  searchKeywords: ["canvas", "distribute", "space", "even"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z.array(z.string()).min(3).describe("IDs of nodes to distribute"),
    direction: z.enum(["horizontal", "vertical"]).describe("Distribution axis"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const nodeIdSet = new Set(params.nodeIds);
    const nodesToDistribute = state.nodes.filter(
      (n) => nodeIdSet.has(n.id) && !n.locked
    );

    if (nodesToDistribute.length < 3) {
      return failure(
        "INVALID_INPUT",
        "Need at least 3 unlocked nodes to distribute"
      );
    }

    const isHorizontal = params.direction === "horizontal";

    const sorted = [...nodesToDistribute].sort((a, b) =>
      isHorizontal ? a.position.x - b.position.x : a.position.y - b.position.y
    );

    const first = sorted[0];
    const last = sorted.at(-1);

    if (!(first && last)) {
      return failure("INTERNAL_ERROR", "Failed to sort nodes");
    }

    const startPos = isHorizontal ? first.position.x : first.position.y;
    const endPos = isHorizontal
      ? last.position.x + (last.dimensions?.width ?? 150)
      : last.position.y + (last.dimensions?.height ?? 50);

    const totalSize = sorted.reduce(
      (sum, n) =>
        sum +
        (isHorizontal
          ? (n.dimensions?.width ?? 150)
          : (n.dimensions?.height ?? 50)),
      0
    );

    const gap = (endPos - startPos - totalSize) / (sorted.length - 1);

    let currentPos = startPos;
    const newPositions: Position[] = [];

    for (const node of sorted) {
      if (isHorizontal) {
        newPositions.push({ x: currentPos, y: node.position.y });
        currentPos += (node.dimensions?.width ?? 150) + gap;
      } else {
        newPositions.push({ x: node.position.x, y: currentPos });
        currentPos += (node.dimensions?.height ?? 50) + gap;
      }
    }

    const operations = sorted.map((node, i) => {
      const nodeIndex = state.nodes.findIndex((n) => n.id === node.id);
      return {
        op: "replace" as const,
        path: `/nodes/${nodeIndex}/position`,
        value: newPositions[i],
      };
    });

    await canvasCtx.applyPatch({
      operations,
      description: `Distribute nodes: ${params.direction}`,
    });

    return success(
      {
        distributedCount: nodesToDistribute.length,
        direction: params.direction,
      },
      { source: "canvas" }
    );
  },
});

export const layoutTools = [
  canvasAutoLayoutTool,
  canvasAlignNodesTool,
  canvasDistributeNodesTool,
];
