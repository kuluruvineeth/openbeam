"use client";

import { EdgeLabelRenderer } from "@xyflow/react";
import { memo, useMemo } from "react";
import { cn } from "../../../utils";
import { REACT_FLOW_NO_INTERACT } from "./constants";

export interface EdgeTooltipProps {
  labelX: number;
  labelY: number;
  isHovered: boolean;
  content: React.ReactNode;
  variant?: "default" | "error" | "info";
}

const variantStyles = {
  default: "",
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  info: "border-primary/30 bg-primary/5 text-primary",
} as const;

export const EdgeTooltip = memo(function EdgeTooltipComponent({
  labelX,
  labelY,
  isHovered,
  content,
  variant = "default",
}: EdgeTooltipProps) {
  const tooltipStyle = useMemo(
    () => ({
      transform: `translate(-50%, calc(-100% - 8px)) translate(${labelX}px, ${labelY}px)`,
    }),
    [labelX, labelY]
  );

  if (!(isHovered && content)) {
    return null;
  }

  return (
    <EdgeLabelRenderer>
      <div
        className={cn(
          `${REACT_FLOW_NO_INTERACT} pointer-events-none absolute rounded-sm border bg-popover px-2 py-1 text-popover-foreground text-xs shadow-sm`,
          variantStyles[variant]
        )}
        style={tooltipStyle}
      >
        {content}
      </div>
    </EdgeLabelRenderer>
  );
});
EdgeTooltip.displayName = "EdgeTooltip";
