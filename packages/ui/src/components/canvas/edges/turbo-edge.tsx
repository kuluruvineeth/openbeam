"use client";

import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import { memo } from "react";

export type TurboEdgeStatus = "idle" | "running" | "success" | "error";

const STATUS_STYLES: Record<
  TurboEdgeStatus,
  { stroke: string; className: string }
> = {
  idle: { stroke: "hsl(var(--border))", className: "" },
  running: { stroke: "url(#turbo-gradient)", className: "edge-animated" },
  success: {
    stroke: "hsl(var(--success, 142 71% 45%))",
    className: "edge-animated-success",
  },
  error: {
    stroke: "hsl(var(--destructive))",
    className: "edge-animated-error",
  },
};

export const TurboEdge = memo(function TurboEdgeComponent({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const status: TurboEdgeStatus = (data?.status as TurboEdgeStatus) ?? "idle";

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { stroke, className } = STATUS_STYLES[status];

  return (
    <>
      {status === "running" && (
        <defs>
          <linearGradient id="turbo-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.2}
            />
            <stop
              offset="50%"
              stopColor="hsl(var(--primary))"
              stopOpacity={1}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.2}
            />
          </linearGradient>
        </defs>
      )}
      <BaseEdge
        className={className}
        id={id}
        markerEnd={markerEnd}
        path={edgePath}
        style={{ stroke, strokeWidth: status === "idle" ? 1.5 : 2 }}
      />
    </>
  );
});
TurboEdge.displayName = "TurboEdge";
