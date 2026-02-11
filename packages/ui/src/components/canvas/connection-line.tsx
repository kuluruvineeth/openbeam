"use client";

import type { ConnectionLineComponentProps } from "@xyflow/react";
import { getBezierPath } from "@xyflow/react";
import { memo } from "react";

export const ConnectionLine = memo(function ConnectionLineComponent({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  const isValid = connectionStatus !== "invalid";

  return (
    <g>
      <path
        className={isValid ? "stroke-primary" : "stroke-destructive/50"}
        d={path}
        fill="none"
        strokeDasharray="6 3"
        strokeWidth={1.5}
      />
      <circle
        className={isValid ? "fill-primary" : "fill-destructive/50"}
        cx={toX}
        cy={toY}
        r={4}
      />
    </g>
  );
});
ConnectionLine.displayName = "ConnectionLine";
