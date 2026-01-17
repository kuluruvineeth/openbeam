"use client";

import type { Node } from "@xyflow/react";
import { MiniMap } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../utils";

export interface CanvasMinimapProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pannable?: boolean;
  zoomable?: boolean;
  className?: string;
}

function getNodeColor(node: Node): string {
  switch (node.type) {
    case "start":
      return "rgb(34, 197, 94)";
    case "end":
      return "rgb(239, 68, 68)";
    case "condition":
      return "rgb(245, 158, 11)";
    case "loop":
      return "rgb(139, 92, 246)";
    case "parallel_split":
    case "parallel_join":
      return "rgb(6, 182, 212)";
    case "llm":
      return "rgb(139, 92, 246)";
    case "rag":
      return "rgb(99, 102, 241)";
    case "summarize":
      return "rgb(217, 70, 239)";
    case "extract":
      return "rgb(244, 63, 94)";
    case "classify":
      return "rgb(236, 72, 153)";
    case "code":
      return "rgb(245, 158, 11)";
    case "template":
      return "rgb(20, 184, 166)";
    case "approval":
      return "rgb(34, 197, 94)";
    case "input":
      return "rgb(6, 182, 212)";
    case "annotation":
      return "rgb(107, 114, 128)";
    default:
      return "rgb(107, 114, 128)";
  }
}

export const CanvasMinimap = memo(function CanvasMinimapComponent({
  position = "bottom-right",
  pannable = true,
  zoomable = true,
  className,
}: CanvasMinimapProps) {
  return (
    <MiniMap
      className={cn(
        "rounded-md border bg-background/95 shadow-sm backdrop-blur-sm",
        className
      )}
      maskColor="hsl(var(--background) / 0.8)"
      nodeColor={getNodeColor}
      nodeStrokeWidth={3}
      pannable={pannable}
      position={position}
      style={{
        width: 150,
        height: 100,
      }}
      zoomable={zoomable}
    />
  );
});
CanvasMinimap.displayName = "CanvasMinimap";
