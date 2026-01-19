"use client";

import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import { forwardRef, memo } from "react";
import { cn } from "../../../utils";

interface NodeLayoutProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}

export const NodeLayout = memo(
  forwardRef<HTMLDivElement, NodeLayoutProps>(function NodeLayoutComponent(
    {
      title,
      children,
      className,
      showSourceHandle = true,
      showTargetHandle = true,
    },
    ref
  ) {
    return (
      <>
        {showTargetHandle && <Handle position={Position.Left} type="target" />}
        <div className="relative size-full h-auto w-80" ref={ref}>
          <div className="-top-2 -translate-y-full absolute right-0 left-0 flex shrink-0 items-center justify-between">
            <p className="font-mono text-muted-foreground text-xs tracking-tighter">
              {title}
            </p>
          </div>
          <div
            className={cn(
              "node-container flex size-full flex-col divide-y bg-card p-2 ring-1 ring-border transition-all",
              className
            )}
          >
            <div className="overflow-hidden bg-card">{children}</div>
          </div>
        </div>
        {showSourceHandle && <Handle position={Position.Right} type="source" />}
      </>
    );
  })
);
NodeLayout.displayName = "NodeLayout";
