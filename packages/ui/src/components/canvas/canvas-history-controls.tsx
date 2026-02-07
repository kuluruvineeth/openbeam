"use client";

import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../utils";
import { Icons } from "../icons";

export interface CanvasHistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export const CanvasHistoryControls = memo(
  function CanvasHistoryControlsComponent({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    className,
  }: CanvasHistoryControlsProps) {
    return (
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-sm border border-border/40 bg-background/95 p-1 shadow-sm backdrop-blur-sm",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "flex size-7 items-center justify-center rounded-sm transition-colors",
                canUndo
                  ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/40"
              )}
              disabled={!canUndo}
              onClick={onUndo}
              type="button"
            >
              <Icons.Undo size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Undo</span>
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
              ⌘Z
            </kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "flex size-7 items-center justify-center rounded-sm transition-colors",
                canRedo
                  ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/40"
              )}
              disabled={!canRedo}
              onClick={onRedo}
              type="button"
            >
              <Icons.Redo size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Redo</span>
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
              ⌘⇧Z
            </kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
);

CanvasHistoryControls.displayName = "CanvasHistoryControls";
