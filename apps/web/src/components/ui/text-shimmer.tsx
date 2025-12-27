"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TextShimmerProps = {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const TextShimmer = React.forwardRef<HTMLElement, TextShimmerProps>(
  (
    { children, as: Component = "p", className, duration = 2, spread = 2 },
    ref
  ) => (
    <Component
      className={cn(
        "relative inline-block bg-[length:250%_100%] bg-[linear-gradient(90deg,transparent,var(--foreground),transparent)] bg-clip-text text-transparent",
        className
      )}
      ref={ref}
      style={{
        animationDuration: `${duration}s`,
        animationIterationCount: "infinite",
        animationName: "shimmer",
        animationTimingFunction: "linear",
        backgroundSize: `${spread * 100}% 100%`,
      }}
    >
      {children}
    </Component>
  )
);
TextShimmer.displayName = "TextShimmer";

export { TextShimmer };
export type { TextShimmerProps };
