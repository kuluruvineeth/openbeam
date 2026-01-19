"use client";

import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

interface StickyColumnProps {
  children: ReactNode;
  position: "left" | "right";
  offset?: number;
  showGradient?: boolean;
  className?: string;
}

function StickyColumn({
  children,
  position,
  offset = 0,
  showGradient = true,
  className,
}: StickyColumnProps) {
  return (
    <div
      className={cn(
        "sticky z-10 bg-background",
        position === "left" ? "left-0" : "right-0",
        className
      )}
      style={{ [position]: offset }}
    >
      {children}
      {showGradient && (
        <div
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 w-8",
            position === "left"
              ? "right-0 translate-x-full bg-gradient-to-r from-background to-transparent"
              : "-translate-x-full left-0 bg-gradient-to-l from-background to-transparent"
          )}
        />
      )}
    </div>
  );
}

export { StickyColumn };
export type { StickyColumnProps };
