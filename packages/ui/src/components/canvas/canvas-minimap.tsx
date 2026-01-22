"use client";

import type { NodeCategory } from "@openplane/types/canvas";
import { MiniMap } from "@xyflow/react";
import { memo, useCallback } from "react";
import { cn } from "../../utils";

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  control: "hsl(var(--node-control))",
  ai: "hsl(var(--node-ai))",
  transform: "hsl(var(--node-transform))",
  human: "hsl(var(--node-human))",
  integration: "hsl(var(--node-integration))",
  trigger: "hsl(var(--node-trigger))",
  memory: "hsl(var(--node-memory))",
  orchestration: "hsl(var(--node-orchestration))",
};

const DEFAULT_COLOR = "hsl(var(--muted-foreground))";

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
