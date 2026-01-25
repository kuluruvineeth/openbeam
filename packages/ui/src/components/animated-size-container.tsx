"use client";

import { motion, type Transition } from "framer-motion";
import { forwardRef, type ReactNode, useRef } from "react";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { cn } from "../utils";

interface AnimatedSizeContainerProps {
  width?: boolean;
  height?: boolean;
  transition?: Transition;
  className?: string;
  children?: ReactNode;
}

export const AnimatedSizeContainer = forwardRef<
  HTMLDivElement,
  AnimatedSizeContainerProps
>(function AnimatedSizeContainerComponent(
  { width = false, height = true, className, transition, children },
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverEntry = useResizeObserver(containerRef);

  return (
    <motion.div
      animate={{
        width: width
          ? (resizeObserverEntry?.contentRect?.width ?? "auto")
          : "auto",
        height: height
          ? (resizeObserverEntry?.contentRect?.height ?? "auto")
          : "auto",
      }}
      className={cn("overflow-hidden", className)}
      ref={forwardedRef}
      transition={transition ?? { type: "spring", duration: 0.3 }}
    >
      <div
        className={cn(height && "h-max", width && "w-max")}
        ref={containerRef}
      >
        {children}
      </div>
    </motion.div>
  );
});

AnimatedSizeContainer.displayName = "AnimatedSizeContainer";
