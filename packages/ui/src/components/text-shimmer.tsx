"use client";

import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { cn } from "../utils/cn";

type TextShimmerProps = ComponentProps<"p"> & {
  as?: React.ElementType;
  duration?: number;
  spread?: number;
};

const TextShimmer = forwardRef<HTMLElement, TextShimmerProps>(
  (
    {
      children,
      as: Component = "p",
      className,
      duration = 2,
      spread = 2,
      ...props
    },
    ref
  ) => {
    const Comp = Component as React.ElementType;
    return (
      <Comp
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
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
TextShimmer.displayName = "TextShimmer";

export { TextShimmer };
export type { TextShimmerProps };
