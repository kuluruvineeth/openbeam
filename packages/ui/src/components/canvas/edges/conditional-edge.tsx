"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils";
import { REACT_FLOW_NO_INTERACT } from "./constants";

export interface ConditionalEdgeData {
  label?: string;
  condition?: string;
  conditionResult?: boolean;
  animated?: boolean;
  executionState?: "idle" | "running" | "success" | "error" | "skipped";
  [key: string]: unknown;
}

type ConditionalEdgeType = Edge<ConditionalEdgeData, "conditional">;

export const ConditionalEdge = memo(function ConditionalEdgeComponent({
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
}: EdgeProps<ConditionalEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const executionState = data?.executionState ?? "idle";
  const conditionResult = data?.conditionResult;
  const isAnimated = data?.animated ?? executionState === "running";

  const stateStyles = {
    idle: "stroke-amber-500/50",
    running: "stroke-amber-500",
    success: conditionResult ? "stroke-green-500" : "stroke-amber-500",
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
        markerEnd={`url(#arrow-${executionState})`}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: executionState === "skipped" ? "5,5" : "8,4",
          ...style,
        }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              `${REACT_FLOW_NO_INTERACT} pointer-events-auto absolute flex items-center gap-1.5 rounded-sm border bg-background px-2 py-1 text-xs`,
              executionState === "skipped" && "opacity-50",
              selected && "border-primary"
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {conditionResult !== undefined && (
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  conditionResult ? "bg-green-500" : "bg-red-500"
                )}
              />
            )}
            <span className="font-medium text-amber-500">{displayLabel}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
ConditionalEdge.displayName = "ConditionalEdge";
