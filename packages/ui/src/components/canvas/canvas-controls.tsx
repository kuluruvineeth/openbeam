"use client";

import { ControlButton, Controls, useReactFlow, useStore } from "@xyflow/react";
import { memo, useCallback, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../utils";
import { Icons } from "../icons";

export interface CanvasControlsProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showZoomPercentage?: boolean;
  showFitView?: boolean;
  showMinimap?: boolean;
  showLock?: boolean;
  minimapVisible?: boolean;
  onLockChange?: (locked: boolean) => void;
  onMinimapToggle?: () => void;
  className?: string;
}

export const CanvasControls = memo(function CanvasControlsComponent({
  position = "bottom-left",
  showZoom = true,
  showZoomPercentage = true,
  showFitView = true,
  showMinimap = false,
  showLock = false,
  minimapVisible = false,
  onLockChange,
  onMinimapToggle,
  className,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const [isLocked, setIsLocked] = useState(false);

  const zoomPercentage = Math.round(zoom * 100);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.2 });
  }, [fitView]);

  const handleResetZoom = useCallback(() => {
    zoomTo(1, { duration: 200 });
  }, [zoomTo]);

  const handleToggleLock = useCallback(() => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    onLockChange?.(newLocked);
  }, [isLocked, onLockChange]);

  return (
    <Controls
      className={cn(
        "flex flex-row items-center gap-0.5 rounded-sm border border-border/40 bg-background/95 p-1 shadow-sm backdrop-blur-sm",
        className
      )}
      orientation="horizontal"
      position={position}
      showFitView={false}
      showInteractive={false}
      showZoom={false}
    >
      {showZoom && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={handleZoomOut}
              >
                <Icons.Minus size={14} />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>Zoom out</span>
              <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
                -
              </kbd>
            </TooltipContent>
          </Tooltip>

          {showZoomPercentage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="min-w-[44px] rounded-sm px-1.5 py-1 font-mono text-[11px] text-muted-foreground tabular-nums transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={handleResetZoom}
                  type="button"
                >
                  {zoomPercentage}%
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Reset to 100%</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={handleZoomIn}
              >
                <Icons.Plus size={14} />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>Zoom in</span>
              <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
                +
              </kbd>
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {(showFitView || showMinimap || showLock) && showZoom && (
        <div className="mx-0.5 h-4 w-px bg-border/40" />
      )}

      {showFitView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              onClick={handleFitView}
            >
              <Icons.Fullscreen size={14} />
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>Fit view</span>
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
              ⌘0
            </kbd>
          </TooltipContent>
        </Tooltip>
      )}

      {showMinimap && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className={cn(
                "flex size-7 items-center justify-center rounded-sm transition-colors",
                minimapVisible
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={onMinimapToggle}
            >
              <Icons.Layers size={14} />
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{minimapVisible ? "Hide minimap" : "Show minimap"}</span>
            <kbd className="ml-1.5 rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px]">
              M
            </kbd>
          </TooltipContent>
        </Tooltip>
      )}

      {showLock && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className={cn(
                "flex size-7 items-center justify-center rounded-sm transition-colors",
                isLocked
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={handleToggleLock}
            >
              {isLocked ? (
                <Icons.LockIcon size={14} />
              ) : (
                <Icons.Unlock size={14} />
              )}
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLocked ? "Unlock canvas" : "Lock canvas"}
          </TooltipContent>
        </Tooltip>
      )}
    </Controls>
  );
});
CanvasControls.displayName = "CanvasControls";
