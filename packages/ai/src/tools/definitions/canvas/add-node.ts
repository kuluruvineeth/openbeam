import type { CanvasOperation } from "@openbeam/types/canvas";
import { CanvasNodeTypeSchema } from "@openbeam/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

const NODE_TYPES_DESCRIPTION = `Add a node to the canvas workflow. Available types: ${CanvasNodeTypeSchema.options.join(", ")}`;

const DEFAULT_X = 240;
const DEFAULT_Y = 140;
const NODE_WIDTH = 320;
const NODE_HEIGHT = 156;
const HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 190;
const NODE_PADDING = 24;

function hasNumberPosition(
  position: unknown
): position is { x: number; y: number } {
  return Boolean(
    position &&
      typeof position === "object" &&
      typeof (position as { x?: unknown }).x === "number" &&
      typeof (position as { y?: unknown }).y === "number"
  );
}

function overlapsExisting(
  candidate: { x: number; y: number },
  existingNodes: Array<{ position?: { x?: number; y?: number } }>
): boolean {
  for (const node of existingNodes) {
    const position = node.position;
    if (!hasNumberPosition(position)) {
      continue;
    }

    const horizontalOverlap = !(
      candidate.x + NODE_WIDTH + NODE_PADDING <= position.x ||
      position.x + NODE_WIDTH + NODE_PADDING <= candidate.x
    );
    const verticalOverlap = !(
      candidate.y + NODE_HEIGHT + NODE_PADDING <= position.y ||
      position.y + NODE_HEIGHT + NODE_PADDING <= candidate.y
    );

    if (horizontalOverlap && verticalOverlap) {
      return true;
    }
  }

  return false;
}

function getDefaultPosition(
  existingNodes: Array<{ position?: { x?: number; y?: number } }>
) {
  if (existingNodes.length === 0) {
    return { x: DEFAULT_X, y: DEFAULT_Y };
  }

  const positionedNodes = existingNodes
    .map((node) => node.position)
    .filter(hasNumberPosition);

  if (positionedNodes.length === 0) {
    return {
      x: DEFAULT_X,
      y: DEFAULT_Y + existingNodes.length * VERTICAL_GAP,
    };
  }

  const minX = Math.min(...positionedNodes.map((position) => position.x));
  const maxX = Math.max(...positionedNodes.map((position) => position.x));
  const minY = Math.min(...positionedNodes.map((position) => position.y));
  const maxY = Math.max(...positionedNodes.map((position) => position.y));
  const centerX = Math.round((minX + maxX) / 2);
  const centerY = Math.round((minY + maxY) / 2);

  const preferredCandidates = [
    { x: maxX + HORIZONTAL_GAP, y: centerY },
    { x: centerX, y: maxY + VERTICAL_GAP },
    { x: centerX, y: minY - VERTICAL_GAP },
    { x: minX - HORIZONTAL_GAP, y: centerY },
  ];

  for (const candidate of preferredCandidates) {
    if (!overlapsExisting(candidate, existingNodes)) {
      return {
        x: Math.round(candidate.x),
        y: Math.round(candidate.y),
      };
    }
  }

  const spiralSteps = 18;
  for (let step = 1; step <= spiralSteps; step += 1) {
    const radiusX = HORIZONTAL_GAP * step * 0.5;
    const radiusY = VERTICAL_GAP * step * 0.5;
    const candidates = [
      { x: centerX + radiusX, y: centerY + radiusY },
      { x: centerX + radiusX, y: centerY - radiusY },
      { x: centerX - radiusX, y: centerY + radiusY },
      { x: centerX - radiusX, y: centerY - radiusY },
    ];

    for (const candidate of candidates) {
      if (!overlapsExisting(candidate, existingNodes)) {
        return {
          x: Math.round(candidate.x),
          y: Math.round(candidate.y),
        };
      }
    }
  }

  const fallback = {
    x: Math.round(maxX + HORIZONTAL_GAP + NODE_WIDTH),
    y: Math.round(centerY),
  };

  if (overlapsExisting(fallback, existingNodes)) {
    return {
      x: fallback.x + HORIZONTAL_GAP,
      y: fallback.y,
    };
  }

  return fallback;
}

export const canvasAddNodeTool = defineTool({
  name: "canvas_add_node",
  description: NODE_TYPES_DESCRIPTION,
  category: "canvas",
  parameters: z.object({
    type: CanvasNodeTypeSchema.describe("The type of node to add"),
    label: z.string().optional().describe("Display label for the node"),
    position: z
      .object({ x: z.number(), y: z.number() })
      .optional()
      .describe("Position on canvas (auto-calculated if not provided)"),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Node-specific configuration"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params, ctx) => {
    const nodeId = crypto.randomUUID();
    const position =
      params.position ?? getDefaultPosition(ctx.canvasState?.nodes ?? []);

    const operation: CanvasOperation = {
      type: "add_node",
      id: nodeId,
      nodeType: params.type,
      position,
      label: params.label,
      config: params.config,
      timestamp: Date.now(),
    };

    if (ctx.canvasState) {
      ctx.canvasState.nodes.push({
        id: nodeId,
        type: params.type,
        data: { label: params.label ?? params.type, ...params.config },
        position,
      });
    }

    const message = params.label
      ? ["Added", params.type, "node", `"${params.label}"`].join(" ")
      : ["Added", params.type, "node"].join(" ");

    return success({
      nodeId,
      operation,
      message,
    });
  },
});
