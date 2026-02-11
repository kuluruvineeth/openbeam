"use client";

import type { Node, OnNodeDrag, XYPosition } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

interface HelperLines {
  horizontal?: number;
  vertical?: number;
}

interface SnappedResult {
  lines: HelperLines;
  snappedPosition: XYPosition | null;
}

interface UseHelperLinesReturn {
  helperLines: HelperLines;
  onNodeDrag: OnNodeDrag;
  onNodeDragStop: OnNodeDrag;
}

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 100;

function getNodeBounds(node: Node) {
  const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
  };
}

export function computeHelperLines(
  draggingNode: Node,
  allNodes: Node[],
  snapDistance: number
): SnappedResult {
  const draggingBounds = getNodeBounds(draggingNode);
  let horizontalLine: number | undefined;
  let verticalLine: number | undefined;
  let closestHorizontalDist = snapDistance + 1;
  let closestVerticalDist = snapDistance + 1;
  let snapX: number | null = null;
  let snapY: number | null = null;

  for (const node of allNodes) {
    if (node.id === draggingNode.id) {
      continue;
    }

    const bounds = getNodeBounds(node);

    const horizontalChecks = [
      { dragging: draggingBounds.centerY, target: bounds.centerY },
      { dragging: draggingBounds.top, target: bounds.top },
      { dragging: draggingBounds.bottom, target: bounds.bottom },
      { dragging: draggingBounds.top, target: bounds.bottom },
      { dragging: draggingBounds.bottom, target: bounds.top },
    ];

    for (const check of horizontalChecks) {
      const dist = Math.abs(check.dragging - check.target);
      if (dist < closestHorizontalDist) {
        closestHorizontalDist = dist;
        horizontalLine = check.target;
        snapY = check.target - (check.dragging - draggingNode.position.y);
      }
    }

    const verticalChecks = [
      { dragging: draggingBounds.centerX, target: bounds.centerX },
      { dragging: draggingBounds.left, target: bounds.left },
      { dragging: draggingBounds.right, target: bounds.right },
      { dragging: draggingBounds.left, target: bounds.right },
      { dragging: draggingBounds.right, target: bounds.left },
    ];

    for (const check of verticalChecks) {
      const dist = Math.abs(check.dragging - check.target);
      if (dist < closestVerticalDist) {
        closestVerticalDist = dist;
        verticalLine = check.target;
        snapX = check.target - (check.dragging - draggingNode.position.x);
      }
    }
  }

  const snappedPosition =
    snapX !== null || snapY !== null
      ? {
          x: snapX ?? draggingNode.position.x,
          y: snapY ?? draggingNode.position.y,
        }
      : null;

  return {
    lines: {
      horizontal:
        closestHorizontalDist <= snapDistance ? horizontalLine : undefined,
      vertical: closestVerticalDist <= snapDistance ? verticalLine : undefined,
    },
    snappedPosition,
  };
}

export function useHelperLines(snapDistance = 5): UseHelperLinesReturn {
  const { getNodes, setNodes } = useReactFlow();
  const [helperLines, setHelperLines] = useState<HelperLines>({});

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, draggingNode) => {
      const allNodes = getNodes();
      const { lines, snappedPosition } = computeHelperLines(
        draggingNode,
        allNodes,
        snapDistance
      );

      setHelperLines(lines);

      if (snappedPosition) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === draggingNode.id ? { ...n, position: snappedPosition } : n
          )
        );
      }
    },
    [getNodes, setNodes, snapDistance]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    setHelperLines({});
  }, []);

  return { helperLines, onNodeDrag, onNodeDragStop };
}

export type { HelperLines, SnappedResult, UseHelperLinesReturn };
