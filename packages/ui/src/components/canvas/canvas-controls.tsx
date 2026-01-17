"use client";

import { ControlButton, Controls, useReactFlow } from "@xyflow/react";
import { Lock, Maximize2, Unlock, ZoomIn, ZoomOut } from "lucide-react";
import { memo, useCallback, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../utils";

export interface CanvasControlsProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showFitView?: boolean;
  showLock?: boolean;
  onLockChange?: (locked: boolean) => void;
  className?: string;
}

export const CanvasControls = memo(function CanvasControlsComponent({
  position = "bottom-left",
  showZoom = true,
  showFitView = true,
  showLock = true,
  onLockChange,
  className,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [isLocked, setIsLocked] = useState(false);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.2 });
  }, [fitView]);

  const handleToggleLock = useCallback(() => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    onLockChange?.(newLocked);
  }, [isLocked, onLockChange]);

  return (
    <Controls
      className={cn(
        "flex flex-col gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur-sm",
        className
      )}
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
                className="rounded-sm hover:bg-muted"
                onClick={handleZoomIn}
              >
                <ZoomIn className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                className="rounded-sm hover:bg-muted"
                onClick={handleZoomOut}
              >
                <ZoomOut className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom Out</TooltipContent>
          </Tooltip>
        </>
      )}

      {showFitView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className="rounded-sm hover:bg-muted"
              onClick={handleFitView}
            >
              <Maximize2 className="size-4" />
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="right">Fit View</TooltipContent>
        </Tooltip>
      )}

      {showLock && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className="rounded-sm hover:bg-muted"
              onClick={handleToggleLock}
            >
              {isLocked ? (
                <Lock className="size-4" />
              ) : (
                <Unlock className="size-4" />
              )}
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isLocked ? "Unlock Canvas" : "Lock Canvas"}
          </TooltipContent>
        </Tooltip>
      )}
    </Controls>
  );
});
CanvasControls.displayName = "CanvasControls";
