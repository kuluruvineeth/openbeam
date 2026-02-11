"use client";

import { type NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";

interface GroupNodeData {
  label: string;
  expanded: boolean;
  [key: string]: unknown;
}

export const GroupNode = memo(function GroupNodeComponent({
  data,
  selected,
}: NodeProps) {
  const { label, expanded } = data as GroupNodeData;

  return (
    <>
      <NodeResizer
        color="hsl(var(--primary))"
        isVisible={selected}
        minHeight={100}
        minWidth={200}
      />
      <div
        className={cn(
          "min-h-[100px] min-w-[200px] rounded-md border-2 border-dashed transition-colors",
          selected
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-muted/10",
          !expanded && "min-h-0 min-w-0"
        )}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <Icons.GitBranch className="text-muted-foreground" size={14} />
          <span className="font-medium text-muted-foreground text-xs">
            {label}
          </span>
          {expanded ? (
            <Icons.ChevronDown
              className="ml-auto text-muted-foreground"
              size={12}
            />
          ) : (
            <Icons.ChevronRight
              className="ml-auto text-muted-foreground"
              size={12}
            />
          )}
        </div>
      </div>
    </>
  );
});
GroupNode.displayName = "GroupNode";
