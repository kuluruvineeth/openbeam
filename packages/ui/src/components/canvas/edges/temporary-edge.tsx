"use client";

import type { TemporaryEdgeData } from "@openbeam/types/canvas";
import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils/cn";
import { REACT_FLOW_NO_INTERACT } from "./constants";

type TemporaryEdgeType = Edge<TemporaryEdgeData, "temporary">;

export const TemporaryEdge = memo(function TemporaryEdgeComponent({
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
}: EdgeProps<TemporaryEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = data?.placeholder ?? "TBD";

  return (
    <>
      <BaseEdge
        className={cn(
          "stroke-muted-foreground/40 transition-colors duration-200",
          selected && "stroke-primary"
        )}
        id={id}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: "8 4",
          ...style,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            `${REACT_FLOW_NO_INTERACT} pointer-events-auto absolute rounded-sm border border-muted-foreground/40 border-dashed bg-muted/50 px-2 py-0.5 font-medium text-muted-foreground text-xs`,
            selected && "border-primary text-primary"
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
TemporaryEdge.displayName = "TemporaryEdge";
