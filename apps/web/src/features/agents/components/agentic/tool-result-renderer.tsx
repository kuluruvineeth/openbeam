"use client";

import type { CanvasOperation } from "@openbeam/types/canvas";
import { memo } from "react";

interface ToolResultRendererProps {
  toolName: string;
  operation?: CanvasOperation;
}

function ToolResultRendererComponent({ operation }: ToolResultRendererProps) {
  if (!operation) {
    return null;
  }

  switch (operation.type) {
    case "add_node":
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="inline-flex h-5 items-center rounded bg-primary/10 px-1.5 text-primary">
            {operation.nodeType}
          </span>
          <span>{operation.label ?? "Node added"}</span>
        </div>
      );

    case "connect":
      return (
        <div className="text-muted-foreground text-xs">
          Connected {operation.source} → {operation.target}
        </div>
      );

    case "remove_node":
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="inline-flex h-5 items-center rounded bg-destructive/10 px-1.5 text-destructive">
            removed
          </span>
          <span>Node removed</span>
        </div>
      );

    default:
      return null;
  }
}

export const ToolResultRenderer = memo(ToolResultRendererComponent);
