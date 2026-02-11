"use client";

import type { EdgeProps } from "@xyflow/react";
import {
  BaseEdge,
  getBezierPath,
  Position,
  useInternalNode,
} from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils/cn";

function getClosestPosition(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number }
) {
  const dx = Math.abs(sourceCenter.x - targetCenter.x);
  const dy = Math.abs(sourceCenter.y - targetCenter.y);

  if (dx > dy) {
    return sourceCenter.x < targetCenter.x
      ? { source: Position.Right, target: Position.Left }
      : { source: Position.Left, target: Position.Right };
  }
  return sourceCenter.y < targetCenter.y
    ? { source: Position.Bottom, target: Position.Top }
    : { source: Position.Top, target: Position.Bottom };
}

export const FloatingEdge = memo(function FloatingEdgeComponent({
  source,
  target,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!(sourceNode && targetNode)) {
    return null;
  }

  const sourceW = sourceNode.measured.width ?? 0;
  const sourceH = sourceNode.measured.height ?? 0;
  const targetW = targetNode.measured.width ?? 0;
  const targetH = targetNode.measured.height ?? 0;

  const sourceCenter = {
    x: sourceNode.internals.positionAbsolute.x + sourceW / 2,
    y: sourceNode.internals.positionAbsolute.y + sourceH / 2,
  };
  const targetCenter = {
    x: targetNode.internals.positionAbsolute.x + targetW / 2,
    y: targetNode.internals.positionAbsolute.y + targetH / 2,
  };

  const positions = getClosestPosition(sourceCenter, targetCenter);

  const [edgePath] = getBezierPath({
    sourceX: sourceCenter.x,
    sourceY: sourceCenter.y,
    sourcePosition: positions.source,
    targetX: targetCenter.x,
    targetY: targetCenter.y,
    targetPosition: positions.target,
  });

  return (
    <BaseEdge
      className={cn(
        "stroke-muted-foreground/50 transition-colors duration-200",
        selected && "stroke-primary"
      )}
      markerEnd={markerEnd}
      path={edgePath}
      style={{ strokeWidth: selected ? 2 : 1.5, ...style }}
    />
  );
});
FloatingEdge.displayName = "FloatingEdge";
