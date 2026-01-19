"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "../../utils/cn";

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}

function SplitLayout({
  left,
  right,
  defaultLeftWidth = 300,
  minLeftWidth = 200,
  maxLeftWidth = 500,
  className,
}: SplitLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const clampedWidth = Math.max(
        minLeftWidth,
        Math.min(maxLeftWidth, newWidth)
      );
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 10;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLeftWidth((w) => Math.max(minLeftWidth, w - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLeftWidth((w) => Math.min(maxLeftWidth, w + step));
      }
    },
    [minLeftWidth, maxLeftWidth]
  );

  return (
    <div className={cn("flex h-full", className)} ref={containerRef}>
      <div className="flex-shrink-0 overflow-auto" style={{ width: leftWidth }}>
        {left}
      </div>

      <button
        aria-label={`Resize panels, current width ${leftWidth} pixels`}
        className={cn(
          "w-1 flex-shrink-0 cursor-col-resize border-0 p-0",
          "bg-border transition-colors hover:bg-primary/50 focus:bg-primary/50 focus:outline-none",
          isDragging && "bg-primary"
        )}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        type="button"
      />

      <div className="flex-1 overflow-auto">{right}</div>
    </div>
  );
}

export { SplitLayout };
export type { SplitLayoutProps };
