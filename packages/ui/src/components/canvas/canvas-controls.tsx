"use client";

import { ControlButton, Controls, useReactFlow } from "@xyflow/react";
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
        "flex flex-row gap-0.5 rounded-full border bg-card/90 p-1 shadow-none drop-shadow-xs backdrop-blur-sm",
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
                className="rounded-full hover:bg-muted"
                onClick={handleZoomIn}
              >
                <Icons.ZoomIn size={16} />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                className="rounded-full hover:bg-muted"
                onClick={handleZoomOut}
              >
                <Icons.ZoomOut size={16} />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom Out</TooltipContent>
          </Tooltip>
        </>
      )}

      {showFitView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className="rounded-full hover:bg-muted"
              onClick={handleFitView}
            >
              <Icons.Fullscreen size={16} />
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="top">Fit View</TooltipContent>
        </Tooltip>
      )}

      {showLock && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ControlButton
              className="rounded-full hover:bg-muted"
              onClick={handleToggleLock}
            >
              {isLocked ? (
                <Icons.LockIcon size={16} />
              ) : (
                <Icons.Unlock size={16} />
              )}
            </ControlButton>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLocked ? "Unlock Canvas" : "Lock Canvas"}
          </TooltipContent>
        </Tooltip>
      )}
    </Controls>
  );
});
CanvasControls.displayName = "CanvasControls";
