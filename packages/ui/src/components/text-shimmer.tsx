"use client";

import { createElement, forwardRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

type TextShimmerProps = {
  as?: React.ElementType;
  duration?: number;
  spread?: number;
  className?: string;
  children?: ReactNode;
};

const TextShimmer = forwardRef<HTMLElement, TextShimmerProps>(
  (
    { children, as: Component = "p", className, duration = 2, spread = 2 },
    ref
  ) =>
    createElement(
      Component,
      {
        className: cn(
          "relative inline-block bg-[length:250%_100%] bg-[linear-gradient(90deg,transparent,var(--foreground),transparent)] bg-clip-text text-transparent",
          className
        ),
        ref,
        style: {
          animationDuration: `${duration}s`,
          animationIterationCount: "infinite",
          animationName: "shimmer",
          animationTimingFunction: "linear",
          backgroundSize: `${spread * 100}% 100%`,
        },
      },
      children
    )
);
TextShimmer.displayName = "TextShimmer";

export { TextShimmer };
export type { TextShimmerProps };
