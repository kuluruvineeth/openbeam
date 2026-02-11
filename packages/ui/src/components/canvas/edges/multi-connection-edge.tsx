"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils/cn";

export interface MultiConnectionEdgeData {
  sourceNodes?: string[];
  label?: string;
  [key: string]: unknown;
}

type MultiConnectionEdgeType = Edge<MultiConnectionEdgeData, "multiConnection">;

const CURVE_OFFSET = 12;

export const MultiConnectionEdge = memo(function MultiConnectionEdgeComponent({
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
}: EdgeProps<MultiConnectionEdgeType>) {
  const sourceCount = data?.sourceNodes?.length ?? 1;
  const curveCount = Math.max(sourceCount, 1);
  const totalSpread = (curveCount - 1) * CURVE_OFFSET;
  const startOffset = -totalSpread / 2;

  return (
    <>
      {Array.from({ length: curveCount }, (_, segmentIndex) => {
        const offset = startOffset + segmentIndex * CURVE_OFFSET;
        const segmentKey = `${id}-o${offset}`;
        const [edgePath] = getBezierPath({
          sourceX,
          sourceY: sourceY + offset,
          sourcePosition,
          targetX,
          targetY: targetY + offset,
          targetPosition,
        });

        return (
          <BaseEdge
            className={cn(
              "stroke-muted-foreground/60 transition-colors duration-200",
              selected && "stroke-primary"
            )}
            id={segmentKey}
            key={segmentKey}
            markerEnd={
              segmentIndex === curveCount - 1 ? "url(#arrow-idle)" : undefined
            }
            path={edgePath}
            style={{
              strokeWidth: selected ? 2 : 1.5,
              ...style,
            }}
          />
        );
      })}
    </>
  );
});
MultiConnectionEdge.displayName = "MultiConnectionEdge";
