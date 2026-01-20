"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils";

export interface ControlEdgeData {
  label?: string;
  condition?: string;
  animated?: boolean;
  executionState?: "idle" | "running" | "success" | "error" | "skipped";
  [key: string]: unknown;
}

type ControlEdgeType = Edge<ControlEdgeData, "control">;

export const ControlEdge = memo(function ControlEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}: EdgeProps<ControlEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const executionState = data?.executionState ?? "idle";
  const isAnimated = data?.animated ?? executionState === "running";

  const stateStyles = {
    idle: "stroke-blue-500/50",
    running: "stroke-blue-500",
    success: "stroke-green-500",
    error: "stroke-red-500",
    skipped: "stroke-muted-foreground/30",
  } as const;

  const displayLabel = data?.condition ?? data?.label;

  return (
    <>
      <BaseEdge
        className={cn(
          "transition-colors duration-200",
          stateStyles[executionState],
          selected && "stroke-primary",
          isAnimated && "edge-animated"
        )}
        id={id}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: executionState === "skipped" ? "5,5" : undefined,
          ...style,
        }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-auto absolute rounded-sm border bg-background px-2 py-1 text-xs",
              executionState === "skipped" && "opacity-50",
              selected && "border-primary"
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span className="font-medium text-blue-500">{displayLabel}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
ControlEdge.displayName = "ControlEdge";
