"use client";

import type { HandleVariant, NodeStatus } from "@openplane/types/canvas";
import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: "",
  pending: "ring-muted-foreground/50 animate-pulse",
  running: "ring-primary ring-2",
  streaming: "ring-primary ring-2 ring-offset-1 ring-offset-background",
  success: "ring-green-500/50",
  error: "ring-destructive",
  waiting:
    "ring-2 ring-amber-400/70 animate-pulse shadow-[0_0_0_4px_rgba(251,191,36,0.15)]",
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
  categoryColor?: string;
  error?: string;
  progress?: number;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const EMPTY_HANDLES: NodeHandle[] = [];

export const NodeShell = memo(
  forwardRef<HTMLDivElement, NodeShellProps>(function NodeShellComponent(
    {
      children,
      status = "idle",
      className,
      handles = EMPTY_HANDLES,
      selected,
      categoryColor,
      error,
      progress,
      ariaLabelledBy,
      ariaDescribedBy,
    },
    ref
  ) {
    const borderStyle = useMemo(
      () =>
        categoryColor
          ? { borderLeftWidth: "3px" as const, borderLeftColor: categoryColor }
          : undefined,
      [categoryColor]
    );

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
        <article
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "node-container flex flex-col rounded-md border border-border/50 bg-card/20 ring-1 ring-transparent transition-all",
            STATUS_STYLES[status],
            selected && "ring-2 ring-primary",
            className
          )}
          data-node-selected={selected ? "true" : undefined}
          data-node-status={status}
          style={borderStyle}
        >
          {children}
          {error && status === "error" && (
            <div className="flex items-center gap-1.5 border-destructive/30 border-t bg-destructive/5 px-3 py-1.5 text-destructive text-xs">
              <Icons.AlertCircle className="shrink-0" size={12} />
              <span className="truncate">{error}</span>
            </div>
          )}
          {status === "running" && typeof progress === "number" && (
            <div className="h-0.5 w-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                }}
              />
            </div>
          )}
        </article>
      </div>
    );
  })
);

NodeShell.displayName = "NodeShell";
