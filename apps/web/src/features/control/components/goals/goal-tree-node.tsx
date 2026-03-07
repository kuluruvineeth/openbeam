"use client";

import type { GoalLevel, GoalStatus } from "@openbeam/types/control";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";

const LEVEL_LABELS: Record<GoalLevel, string> = {
  COMPANY: "Company",
  TEAM: "Team",
  AGENT: "Agent",
  TASK: "Task",
};

const LEVEL_COLORS: Record<GoalLevel, string> = {
  COMPANY: "text-violet-600",
  TEAM: "text-blue-600",
  AGENT: "text-emerald-600",
  TASK: "text-zinc-500",
};

type GoalNode = {
  id: string;
  title: string;
  level: GoalLevel;
  status: GoalStatus;
  parentId: string | null;
  children?: GoalNode[];
};

type GoalTreeNodeProps = {
  node: GoalNode;
  depth?: number;
  onSelect: (goalId: string) => void;
};

export function GoalTreeNode({ node, depth = 0, onSelect }: GoalTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left transition-colors",
          "hover:bg-muted/50"
        )}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        type="button"
      >
        {hasChildren ? (
          <button
            className="shrink-0 text-muted-foreground transition-transform hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            type="button"
          >
            <Icons.ChevronRight
              className={cn(
                "transition-transform duration-150",
                expanded && "rotate-90"
              )}
              size={14}
            />
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        <Icons.Target
          className={cn("shrink-0", LEVEL_COLORS[node.level])}
          size={14}
        />

        <span className="min-w-0 flex-1 truncate text-sm">{node.title}</span>

        <span
          className={cn(
            "shrink-0 font-medium text-[10px]",
            LEVEL_COLORS[node.level]
          )}
        >
          {LEVEL_LABELS[node.level]}
        </span>

        <StatusBadge domain="goal" size="sm" status={node.status} />
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children?.map((child) => (
            <GoalTreeNode
              depth={depth + 1}
              key={child.id}
              node={child}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { GoalNode };
