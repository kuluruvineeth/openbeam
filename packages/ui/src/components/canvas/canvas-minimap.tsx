"use client";

import type { NodeCategory } from "@openplane/types/canvas";
import { MiniMap } from "@xyflow/react";
import { memo, useCallback } from "react";
import { cn } from "../../utils";

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  control: "var(--node-control)",
  ai: "var(--node-ai)",
  transform: "var(--node-transform)",
  human: "var(--node-human)",
  integration: "var(--node-integration)",
  trigger: "var(--node-trigger)",
  memory: "var(--node-memory)",
  orchestration: "var(--node-orchestration)",
};

const DEFAULT_COLOR = "var(--muted-foreground)";

export interface CanvasMinimapProps {
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pannable?: boolean;
  zoomable?: boolean;
}

export const CanvasMinimap = memo(function CanvasMinimapComponent({
  className,
  position = "bottom-right",
  pannable = true,
  zoomable = true,
}: CanvasMinimapProps) {
  const nodeColor = useCallback((node: { data?: { category?: string } }) => {
    const category = node.data?.category as NodeCategory | undefined;
    return category
      ? (CATEGORY_COLORS[category] ?? DEFAULT_COLOR)
      : DEFAULT_COLOR;
  }, []);

  return (
    <MiniMap
      className={cn(
        "rounded-md border bg-card/90 shadow-sm backdrop-blur-sm",
        "[&_.react-flow__minimap-mask]:fill-background/80",
        className
      )}
      maskColor="transparent"
      nodeColor={nodeColor}
      pannable={pannable}
      position={position}
      zoomable={zoomable}
    />
  );
});

CanvasMinimap.displayName = "CanvasMinimap";
