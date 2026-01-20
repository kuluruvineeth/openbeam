"use client";

import type { HandleVariant, NodeStatus } from "@openplane/types/canvas";
import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: "",
  pending: "ring-muted-foreground/50 animate-pulse",
  running: "ring-primary ring-2",
  success: "ring-green-500/50",
  error: "ring-destructive",
  waiting: "ring-amber-500/50 animate-pulse",
  skipped: "opacity-60",
};

const HANDLE_VARIANT_STYLES: Record<HandleVariant, string> = {
  default: "border-border",
  true: "border-green-500",
  false: "border-red-500",
  loop: "border-orange-500",
  done: "border-blue-500",
};

interface NodeHandle {
  id?: string;
  type: "source" | "target";
  position: Position;
  variant?: HandleVariant;
  offset?: string;
  label?: string;
}

interface NodeShellProps {
  children: ReactNode;
  status?: NodeStatus;
  className?: string;
  handles?: NodeHandle[];
  selected?: boolean;
}

export const NodeShell = memo(
  forwardRef<HTMLDivElement, NodeShellProps>(function NodeShellComponent(
    { children, status = "idle", className, handles = [], selected },
    ref
  ) {
    return (
      <div className="relative w-80" ref={ref}>
        {handles.map((handle, i) => {
          const isLeft = handle.position === Position.Left;
          const isRight = handle.position === Position.Right;
          return (
            <div
              className="absolute z-10"
              key={handle.id ?? `handle-${i}`}
              style={{
                top: handle.offset ?? "50%",
                left: isLeft ? -6 : undefined,
                right: isRight ? -6 : undefined,
                transform: "translateY(-50%)",
              }}
            >
              <Handle
                className={cn(
                  "!relative !top-0 !left-0 !right-0 !transform-none size-3 rounded-full border-2 bg-background transition-colors",
                  HANDLE_VARIANT_STYLES[handle.variant ?? "default"]
                )}
                id={handle.id}
                position={handle.position}
                type={handle.type}
              />
              {handle.label && (
                <span
                  className={cn(
                    "-translate-y-1/2 pointer-events-none absolute top-1/2 whitespace-nowrap text-muted-foreground text-xs",
                    isRight ? "right-full mr-3" : "left-full ml-3"
                  )}
                >
                  {handle.label}
                </span>
              )}
            </div>
          );
        })}
        <div
          className={cn(
            "flex flex-col rounded-md border bg-card shadow-sm ring-1 ring-transparent transition-all",
            STATUS_STYLES[status],
            selected && "ring-2 ring-primary",
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  })
);

NodeShell.displayName = "NodeShell";
