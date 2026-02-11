"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { REACT_FLOW_NO_INTERACT } from "./constants";

export interface ErrorEdgeData {
  label?: string;
  errorMessage?: string;
  animated?: boolean;
  executionState?: "idle" | "triggered" | "resolved";
  [key: string]: unknown;
}

type ErrorEdgeType = Edge<ErrorEdgeData, "error">;

export const ErrorEdge = memo(function ErrorEdgeComponent({
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
}: EdgeProps<ErrorEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const executionState = data?.executionState ?? "idle";
  const isAnimated = data?.animated ?? executionState === "triggered";

  const stateStyles = {
    idle: "stroke-red-500/30",
    triggered: "stroke-red-500",
    resolved: "stroke-green-500",
  } as const;

  const arrowIdMap = {
    idle: "arrow-idle",
    triggered: "arrow-error",
    resolved: "arrow-success",
  } as const;

  const displayLabel = data?.errorMessage ?? data?.label ?? "Error";

  return (
    <>
      <BaseEdge
        className={cn(
          "transition-colors duration-200",
          stateStyles[executionState],
          selected && "stroke-primary",
          isAnimated && "edge-animated-error"
        )}
        id={id}
        markerEnd={`url(#${arrowIdMap[executionState]})`}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: "3,3",
          ...style,
        }}
      />
      {executionState !== "idle" && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              `${REACT_FLOW_NO_INTERACT} pointer-events-auto absolute flex items-center gap-1.5 rounded-sm border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs`,
              executionState === "resolved" &&
                "border-green-500/50 bg-green-500/10",
              selected && "border-primary"
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <Icons.AlertCircle
              className={cn(
                "h-3 w-3",
                executionState === "triggered" && "text-red-500",
                executionState === "resolved" && "text-green-500"
              )}
            />
            <span
              className={cn(
                "max-w-[120px] truncate font-medium",
                executionState === "triggered" && "text-red-500",
                executionState === "resolved" && "text-green-500"
              )}
            >
              {displayLabel}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
ErrorEdge.displayName = "ErrorEdge";
