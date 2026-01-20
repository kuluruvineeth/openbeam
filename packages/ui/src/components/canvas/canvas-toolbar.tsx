"use client";

import { useReactFlow } from "@xyflow/react";
import {
  Clipboard,
  Copy,
  CopyPlus,
  Grid3X3,
  Hand,
  Lock,
  Magnet,
  Maximize2,
  MousePointer2,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ComponentType } from "react";
import { memo, useCallback, useState } from "react";
import { Button } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Separator } from "../../components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../utils";

type CanvasTool = "select" | "pan" | "add";

export interface CanvasToolbarProps {
  className?: string;
  selectedNodeIds?: string[];
  canUndo?: boolean;
  canRedo?: boolean;
  isLocked?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: (nodeIds: string[]) => void;
  onDuplicate?: (nodeIds: string[]) => void;
  onToggleLock?: () => void;
  onToggleGrid?: () => void;
  onToggleSnapToGrid?: () => void;
  onAddNode?: (type: string) => void;
  onToolChange?: (tool: CanvasTool) => void;
  onClipboardError?: (error: unknown) => void;
}

interface ToolButtonProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function ToolButton({
  icon: Icon,
  label,
  isActive,
  disabled,
  onClick,
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-8 w-8"
          disabled={disabled}
          onClick={onClick}
          size="icon"
          variant={isActive ? "secondary" : "ghost"}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export const CanvasToolbar = memo(function CanvasToolbarComponent({
  className,
  selectedNodeIds = [],
  canUndo = false,
  canRedo = false,
  isLocked = false,
  showGrid = true,
  snapToGrid = false,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleGrid,
  onToggleSnapToGrid,
  onAddNode,
  onToolChange,
  onClipboardError,
}: CanvasToolbarProps) {
  const reactFlow = useReactFlow();
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  const handleToolChange = useCallback(
    (tool: CanvasTool) => {
      setActiveTool(tool);
      onToolChange?.(tool);
    },
    [onToolChange]
  );

  const handleZoomIn = useCallback(() => {
    reactFlow.zoomIn({ duration: 200 });
  }, [reactFlow]);

  const handleZoomOut = useCallback(() => {
    reactFlow.zoomOut({ duration: 200 });
  }, [reactFlow]);

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ duration: 300, padding: 0.2 });
  }, [reactFlow]);

  const handleDelete = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      onDelete?.(selectedNodeIds);
    }
  }, [selectedNodeIds, onDelete]);

  const handleDuplicate = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      onDuplicate?.(selectedNodeIds);
    }
  }, [selectedNodeIds, onDuplicate]);

  const handleCopy = useCallback(async () => {
    const nodes = reactFlow
      .getNodes()
      .filter((n) => selectedNodeIds.includes(n.id));
    if (nodes.length > 0) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(nodes));
      } catch (error) {
        onClipboardError?.(error);
      }
    }
  }, [reactFlow, selectedNodeIds, onClipboardError]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      JSON.parse(text);
    } catch (error) {
      onClipboardError?.(error);
    }
  }, [onClipboardError]);

  const hasSelection = selectedNodeIds.length > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60",
        className
      )}
    >
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={MousePointer2}
          isActive={activeTool === "select"}
          label="Select (V)"
          onClick={() => handleToolChange("select")}
        />
        <ToolButton
          icon={Hand}
          isActive={activeTool === "pan"}
          label="Pan (H)"
          onClick={() => handleToolChange("pan")}
        />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-8 w-8"
                  size="icon"
                  variant={activeTool === "add" ? "secondary" : "ghost"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add Node (A)</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onAddNode?.("llm")}>
              <Plus className="mr-2 h-4 w-4" />
              LLM Node
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode?.("rag")}>
              <Plus className="mr-2 h-4 w-4" />
              RAG Node
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode?.("code")}>
              <Plus className="mr-2 h-4 w-4" />
              Code Node
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddNode?.("input")}>
              <Plus className="mr-2 h-4 w-4" />
              Input Node
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode?.("condition")}>
              <Plus className="mr-2 h-4 w-4" />
              Condition Node
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode?.("loop")}>
              <Plus className="mr-2 h-4 w-4" />
              Loop Node
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <div className="flex items-center gap-0.5">
        <ToolButton
          disabled={!canUndo}
          icon={Undo2}
          label="Undo (⌘Z)"
          onClick={onUndo}
        />
        <ToolButton
          disabled={!canRedo}
          icon={Redo2}
          label="Redo (⌘⇧Z)"
          onClick={onRedo}
        />
      </div>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <div className="flex items-center gap-0.5">
        <ToolButton
          disabled={!hasSelection}
          icon={Copy}
          label="Copy (⌘C)"
          onClick={handleCopy}
        />
        <ToolButton icon={Clipboard} label="Paste (⌘V)" onClick={handlePaste} />
        <ToolButton
          disabled={!hasSelection}
          icon={CopyPlus}
          label="Duplicate (⌘D)"
          onClick={handleDuplicate}
        />
        <ToolButton
          disabled={!hasSelection}
          icon={Trash2}
          label="Delete (⌫)"
          onClick={handleDelete}
        />
      </div>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={ZoomOut}
          label="Zoom Out (-)"
          onClick={handleZoomOut}
        />
        <ToolButton icon={ZoomIn} label="Zoom In (+)" onClick={handleZoomIn} />
        <ToolButton
          icon={Maximize2}
          label="Fit View (F)"
          onClick={handleFitView}
        />
      </div>

      <Separator className="mx-1 h-6" orientation="vertical" />

      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={isLocked ? Lock : Unlock}
          isActive={isLocked}
          label={isLocked ? "Unlock Canvas" : "Lock Canvas"}
          onClick={onToggleLock}
        />
        <ToolButton
          icon={Grid3X3}
          isActive={showGrid}
          label="Toggle Grid (G)"
          onClick={onToggleGrid}
        />
        <ToolButton
          icon={Magnet}
          isActive={snapToGrid}
          label="Snap to Grid"
          onClick={onToggleSnapToGrid}
        />
      </div>
    </div>
  );
});
CanvasToolbar.displayName = "CanvasToolbar";
