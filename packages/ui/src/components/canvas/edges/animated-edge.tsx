"use client";

import type { EdgeProps, InternalNode, Node } from "@xyflow/react";
import {
  BaseEdge,
  getBezierPath,
  Position,
  useInternalNode,
} from "@xyflow/react";
import { memo } from "react";

function getHandleCoordsByIdOrPosition(
  node: InternalNode<Node>,
  handleId: string | null | undefined,
  handlePosition: Position,
  handleType: "source" | "target"
): [number, number] {
  const handles = node.internals.handleBounds?.[handleType];

  if (!handles?.length) {
    return [0, 0];
  }

  // Find handle by ID first, then fall back to position, then first handle
  const handle =
    (handleId ? handles.find((h) => h.id === handleId) : undefined) ??
    handles.find((h) => h.position === handlePosition) ??
    handles[0];

  if (!handle) {
    return [0, 0];
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  switch (handle.position) {
    case Position.Left:
      offsetX = 0;
      break;
    case Position.Right:
      offsetX = handle.width;
      break;
    case Position.Top:
      offsetY = 0;
      break;
    case Position.Bottom:
      offsetY = handle.height;
      break;
    default:
      break;
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

  return [x, y];
}

function getEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
  sourceHandleId: string | null | undefined,
  targetHandleId: string | null | undefined
) {
  const sourcePos = Position.Right;
  const [sx, sy] = getHandleCoordsByIdOrPosition(
    source,
    sourceHandleId,
    sourcePos,
    "source"
  );
  const targetPos = Position.Left;
  const [tx, ty] = getHandleCoordsByIdOrPosition(
    target,
    targetHandleId,
    targetPos,
    "target"
  );

  return { sx, sy, tx, ty, sourcePos, targetPos };
}

export const AnimatedEdge = memo(function AnimatedEdgeComponent({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  markerEnd,
  style,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
    sourceHandleId,
    targetHandleId
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      <BaseEdge id={id} markerEnd={markerEnd} path={edgePath} style={style} />
      <circle fill="var(--primary)" r="4">
        <animateMotion dur="2s" path={edgePath} repeatCount="indefinite" />
      </circle>
    </>
  );
});
AnimatedEdge.displayName = "AnimatedEdge";
