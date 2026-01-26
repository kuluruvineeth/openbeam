"use client";

import type { CanvasNodeType, NodeStatus } from "@openplane/types/canvas";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, memo, useCallback, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { NODE_COLORS } from "../nodes/node-colors";

const headerVariants = cva(
  "flex items-center justify-between border-b px-4 py-3 transition-colors",
  {
    variants: {
      status: {
        idle: "border-border/50",
        pending: "border-amber-500/30 bg-amber-500/5",
        running: "border-primary/50 bg-primary/5",
        streaming: "border-primary/50 bg-primary/5",
        success: "border-green-500/30 bg-green-500/5",
        error: "border-destructive/30 bg-destructive/5",
        waiting: "border-amber-500/30",
        skipped: "border-border/30 opacity-60",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  }
);

interface ConfigPanelHeaderProps extends VariantProps<typeof headerVariants> {
  nodeId: string;
  nodeType: CanvasNodeType;
  nodeLabel: string;
  status?: NodeStatus;
  onLabelChange?: (label: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  className?: string;
}

export const ConfigPanelHeader = memo(
  forwardRef<HTMLDivElement, ConfigPanelHeaderProps>(
    function ConfigPanelHeaderComponent(
      {
        nodeId: _nodeId,
        nodeType,
        nodeLabel,
        status = "idle",
        onLabelChange,
        onDelete,
        onDuplicate,
        onClose,
        className,
      },
      ref
    ) {
      const [isEditing, setIsEditing] = useState(false);
      const [editValue, setEditValue] = useState(nodeLabel);

      const nodeColor = NODE_COLORS[nodeType] ?? NODE_COLORS.default;

      const handleSave = useCallback(() => {
        if (editValue.trim() && editValue !== nodeLabel) {
          onLabelChange?.(editValue.trim());
        }
        setIsEditing(false);
      }, [editValue, nodeLabel, onLabelChange]);

      const handleCancel = useCallback(() => {
        setEditValue(nodeLabel);
        setIsEditing(false);
      }, [nodeLabel]);

      const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
          if (e.key === "Enter") {
            handleSave();
          }
          if (e.key === "Escape") {
            handleCancel();
          }
        },
        [handleSave, handleCancel]
      );

      return (
        <div className={cn(headerVariants({ status }), className)} ref={ref}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: nodeColor }}
            />

            {isEditing ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Input
                  autoFocus
                  className="h-7 font-medium text-sm"
                  onBlur={handleSave}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  value={editValue}
                />
                <Button
                  className="size-7 shrink-0"
                  onClick={handleSave}
                  size="icon"
                  variant="ghost"
                >
                  <Icons.Check className="size-3.5" />
                </Button>
                <Button
                  className="size-7 shrink-0"
                  onClick={handleCancel}
                  size="icon"
                  variant="ghost"
                >
                  <Icons.Close className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  className="truncate text-left font-medium text-sm transition-colors hover:text-primary"
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  {nodeLabel}
                </button>
                <Button
                  className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setIsEditing(true)}
                  size="icon"
                  variant="ghost"
                >
                  <Icons.Pencil className="size-3" />
                </Button>
              </div>
            )}

            <Badge className="shrink-0 font-mono text-xs" variant="outline">
              {nodeType}
            </Badge>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {onDuplicate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={onDuplicate}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.Copy className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs" side="bottom">
                  Duplicate
                  <kbd className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                    ⌘D
                  </kbd>
                </TooltipContent>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={onDelete}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.Trash className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs" side="bottom">
                  Delete
                  <kbd className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                    ⌫
                  </kbd>
                </TooltipContent>
              </Tooltip>
            )}

            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.Close className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs" side="bottom">
                  Close
                  <kbd className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                    Esc
                  </kbd>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      );
    }
  )
);

ConfigPanelHeader.displayName = "ConfigPanelHeader";
