"use client";

import { Position, NodeToolbar as RFNodeToolbar } from "@xyflow/react";
import { memo, type ReactNode } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";

interface ToolbarAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface NodeFloatingToolbarProps {
  isVisible: boolean;
  position?: Position;
  actions?: ToolbarAction[];
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
}

const ToolbarButton = memo(function ToolbarButtonComponent({
  action,
}: {
  action: ToolbarAction;
}) {
  return (
    <button
      aria-label={action.label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        action.variant === "destructive" &&
          "hover:bg-destructive/10 hover:text-destructive"
      )}
      disabled={action.disabled}
      onClick={action.onClick}
      title={action.label}
      type="button"
    >
      {action.icon}
    </button>
  );
});
ToolbarButton.displayName = "ToolbarButton";

export const NodeFloatingToolbar = memo(function NodeFloatingToolbarComponent({
  isVisible,
  position = Position.Top,
  actions,
  onDuplicate,
  onDelete,
  onTest,
}: NodeFloatingToolbarProps) {
  const defaultActions: ToolbarAction[] = [];

  if (onTest) {
    defaultActions.push({
      id: "test",
      icon: <Icons.Play size={14} />,
      label: "Test node",
      onClick: onTest,
    });
  }

  if (onDuplicate) {
    defaultActions.push({
      id: "duplicate",
      icon: <Icons.Copy size={14} />,
      label: "Duplicate",
      onClick: onDuplicate,
    });
  }

  if (onDelete) {
    defaultActions.push({
      id: "delete",
      icon: <Icons.Trash size={14} />,
      label: "Delete",
      onClick: onDelete,
      variant: "destructive",
    });
  }

  const allActions = actions ?? defaultActions;

  if (allActions.length === 0) {
    return null;
  }

  return (
    <RFNodeToolbar align="center" isVisible={isVisible} position={position}>
      <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-popover p-0.5 shadow-sm">
        {allActions.map((action) => (
          <ToolbarButton action={action} key={action.id} />
        ))}
      </div>
    </RFNodeToolbar>
  );
});
NodeFloatingToolbar.displayName = "NodeFloatingToolbar";
