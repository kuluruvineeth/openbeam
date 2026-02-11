"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils";
import { REACT_FLOW_NO_INTERACT } from "./constants";

export interface DataEdgeData {
  label?: string;
  animated?: boolean;
  executionState?: "idle" | "running" | "success" | "error";
  [key: string]: unknown;
}

type DataEdgeType = Edge<DataEdgeData, "data">;

export const DataEdge = memo(function DataEdgeComponent({
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
}: EdgeProps<DataEdgeType>) {
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
    idle: "stroke-muted-foreground/50",
    running: "stroke-blue-500",
    success: "stroke-green-500",
    error: "stroke-red-500",
  } as const;

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
          ...style,
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              `${REACT_FLOW_NO_INTERACT} pointer-events-auto absolute rounded-sm border bg-background px-1.5 py-0.5 text-xs`,
              selected && "border-primary"
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
DataEdge.displayName = "DataEdge";
