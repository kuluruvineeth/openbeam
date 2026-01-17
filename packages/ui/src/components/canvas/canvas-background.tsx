"use client";

import { Background, BackgroundVariant } from "@xyflow/react";
import { memo } from "react";

export interface CanvasBackgroundProps {
  variant?: BackgroundVariant;
  gap?: number;
  size?: number;
  color?: string;
}

export const CanvasBackground = memo(function CanvasBackgroundComponent({
  variant = BackgroundVariant.Dots,
  gap = 20,
  size = 1,
  color,
}: CanvasBackgroundProps) {
  return (
    <Background
      className="bg-background"
      color={color ?? "hsl(var(--muted-foreground) / 0.2)"}
      gap={gap}
      size={size}
      variant={variant}
    />
  );
});
CanvasBackground.displayName = "CanvasBackground";
