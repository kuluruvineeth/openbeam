"use client";

import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

interface Waypoint {
  x: number;
  y: number;
}

interface Segment {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
}

interface BuildSegmentsInput {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  waypoints: Waypoint[];
}

export function buildSegments(input: BuildSegmentsInput): Segment[] {
  const { sourceX, sourceY, targetX, targetY, waypoints } = input;

  if (waypoints.length === 0) {
    return [
      {
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
    ];
  }

  const segments: Segment[] = [];
  let prevX = sourceX;
  let prevY = sourceY;

  for (const wp of waypoints) {
    segments.push({
      sourceX: prevX,
      sourceY: prevY,
      targetX: wp.x,
      targetY: wp.y,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
    prevX = wp.x;
    prevY = wp.y;
  }

  segments.push({
    sourceX: prevX,
    sourceY: prevY,
    targetX,
    targetY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  return segments;
}

function segmentKey(edgeId: string, seg: Segment): string {
  return `${edgeId}-${seg.sourceX}-${seg.sourceY}-${seg.targetX}-${seg.targetY}`;
}

function waypointKey(edgeId: string, wp: Waypoint): string {
  return `${edgeId}-wp-${wp.x}-${wp.y}`;
}

export const EditableEdge = memo(function EditableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const waypoints: Waypoint[] = (data?.waypoints as Waypoint[]) ?? [];
  const segments = buildSegments({
    sourceX,
    sourceY,
    targetX,
    targetY,
    waypoints,
  });

  const onWaypointDrag = useCallback(
    (index: number, pos: { x: number; y: number }) => {
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id !== id) {
            return edge;
          }
          const updated = [...((edge.data?.waypoints as Waypoint[]) ?? [])];
          updated[index] = { x: pos.x, y: pos.y };
          return { ...edge, data: { ...edge.data, waypoints: updated } };
        })
      );
    },
    [id, setEdges]
  );

  return (
    <>
      {segments.map((seg: Segment, i: number) => {
        const [path] = getBezierPath({
          sourceX: seg.sourceX,
          sourceY: seg.sourceY,
          sourcePosition: seg.sourcePosition,
          targetX: seg.targetX,
          targetY: seg.targetY,
          targetPosition: seg.targetPosition,
        });
        const key = segmentKey(id, seg);
        return (
          <BaseEdge
            id={key}
            key={key}
            markerEnd={i === segments.length - 1 ? markerEnd : undefined}
            path={path}
            style={style}
          />
        );
      })}
      {waypoints.map((wp: Waypoint, i: number) => (
        <WaypointCircle
          index={i}
          key={waypointKey(id, wp)}
          onWaypointDrag={onWaypointDrag}
          wp={wp}
        />
      ))}
    </>
  );
});
EditableEdge.displayName = "EditableEdge";

const WaypointCircle = memo(function WaypointCircleComponent({
  wp,
  index,
  onWaypointDrag,
}: {
  wp: Waypoint;
  index: number;
  onWaypointDrag: (index: number, pos: { x: number; y: number }) => void;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const onMove = (me: MouseEvent) => {
        onWaypointDrag(index, { x: me.clientX, y: me.clientY });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [index, onWaypointDrag]
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: SVG circle requires direct mouse events for drag
    <circle
      className="cursor-grab fill-background stroke-2 stroke-primary"
      cx={wp.x}
      cy={wp.y}
      onMouseDown={handleMouseDown}
      r={6}
    />
  );
});
WaypointCircle.displayName = "WaypointCircle";
