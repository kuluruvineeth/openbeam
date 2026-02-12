"use client";

import type { Header } from "@tanstack/react-table";
import { cn } from "../../utils/cn";

interface ResizeHandleProps<TData> {
  header: Header<TData, unknown>;
  className?: string;
}

function ResizeHandle<TData>({ header, className }: ResizeHandleProps<TData>) {
  if (!header.column.getCanResize()) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none",
        "bg-transparent",
        className
      )}
      onDoubleClick={() => header.column.resetSize()}
      onMouseDown={(e) => {
        e.stopPropagation();
        header.getResizeHandler()(e);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => {
        e.stopPropagation();
        header.getResizeHandler()(e);
      }}
      role="presentation"
      style={{
        transform: "translateX(50%)",
      }}
    />
  );
}

export { ResizeHandle };
export type { ResizeHandleProps };
