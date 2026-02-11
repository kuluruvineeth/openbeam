import type { AgentCanvasNode } from "@openplane/types/canvas";

const DEFAULT_X = 240;
const DEFAULT_Y = 120;
const NODE_WIDTH = 320;
const NODE_HEIGHT = 156;
const HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 190;
const NODE_PADDING = 24;

function hasFinitePosition(node: AgentCanvasNode): boolean {
  return Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y);
}

function overlapsExisting(
  candidate: { x: number; y: number },
  existingNodes: AgentCanvasNode[]
): boolean {
  for (const node of existingNodes) {
    if (!hasFinitePosition(node)) {
      continue;
    }

    const horizontalOverlap = !(
      candidate.x + NODE_WIDTH + NODE_PADDING <= node.position.x ||
      node.position.x + NODE_WIDTH + NODE_PADDING <= candidate.x
    );
    const verticalOverlap = !(
      candidate.y + NODE_HEIGHT + NODE_PADDING <= node.position.y ||
      node.position.y + NODE_HEIGHT + NODE_PADDING <= candidate.y
    );

    if (horizontalOverlap && verticalOverlap) {
      return true;
    }
  }

  return false;
}

export function calculateNextPosition(existingNodes: AgentCanvasNode[]): {
  x: number;
  y: number;
} {
  if (existingNodes.length === 0) {
    return { x: DEFAULT_X, y: DEFAULT_Y };
  }

  const positionedNodes = existingNodes.filter(hasFinitePosition);

  if (positionedNodes.length === 0) {
    return {
      x: DEFAULT_X,
      y: DEFAULT_Y + existingNodes.length * VERTICAL_GAP,
    };
  }

  const minX = Math.min(...positionedNodes.map((node) => node.position.x));
  const maxX = Math.max(...positionedNodes.map((node) => node.position.x));
  const minY = Math.min(...positionedNodes.map((node) => node.position.y));
  const maxY = Math.max(...positionedNodes.map((node) => node.position.y));

  const centerX = Math.round((minX + maxX) / 2);
  const centerY = Math.round((minY + maxY) / 2);

  const primaryCandidates = [
    { x: maxX + HORIZONTAL_GAP, y: centerY },
    { x: centerX, y: maxY + VERTICAL_GAP },
    { x: centerX, y: minY - VERTICAL_GAP },
    { x: minX - HORIZONTAL_GAP, y: centerY },
    { x: centerX + Math.round(HORIZONTAL_GAP * 0.5), y: centerY },
  ];

  for (const candidate of primaryCandidates) {
    if (!overlapsExisting(candidate, positionedNodes)) {
      return candidate;
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
      if (!overlapsExisting(candidate, positionedNodes)) {
        return {
          x: Math.round(candidate.x),
          y: Math.round(candidate.y),
        };
      }
    }
  }

  return {
    x: Math.round(maxX + HORIZONTAL_GAP),
    y: Math.round(centerY),
  };
}
