"use client";

import type { ToolCallSummary } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { memo } from "react";
import { cn } from "@/lib/utils";

const toolCallBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px]",
  {
    variants: {
      status: {
        running:
          "animate-pulse bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        completed: "bg-muted text-muted-foreground",
        failed: "bg-red-500/10 text-red-600 dark:text-red-400",
      },
    },
  }
);

const TOOL_ICON_MAP: Record<string, keyof typeof Icons> = {
  search: "Search",
  fetch: "Globe",
  read: "Eye",
  write: "Pencil",
  analyze: "BrainCircuit",
  code: "Code",
  scrape: "Globe",
};

function resolveToolIcon(toolName: string): keyof typeof Icons {
  const lower = toolName.toLowerCase();
  for (const [key, icon] of Object.entries(TOOL_ICON_MAP)) {
    if (lower.includes(key)) {
      return icon;
    }
  }
  return "Wrench";
}

const TOOL_NAME_SEPARATOR = /[._-]/;

function abbreviateToolName(name: string): string {
  const parts = name.split(TOOL_NAME_SEPARATOR);
  if (parts.length <= 2) {
    return name;
  }
  return parts.slice(0, 2).join("_");
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

type AgentToolCallStripProps = {
  toolCalls: ToolCallSummary[];
};

export const AgentToolCallStrip = memo(function AgentToolCallStripInner({
  toolCalls,
}: AgentToolCallStripProps) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {toolCalls.map((tc) => {
        const iconName = resolveToolIcon(tc.toolName);
        const IconComponent = Icons[iconName];

        return (
          <span
            className={cn(toolCallBadgeVariants({ status: tc.status }))}
            key={tc.toolCallId}
            title={tc.toolName}
          >
            <IconComponent size={10} />
            <span className="max-w-[60px] truncate">
              {abbreviateToolName(tc.toolName)}
            </span>
            {tc.status === "completed" && tc.durationMs !== undefined && (
              <span className="opacity-70">
                {formatDuration(tc.durationMs)}
              </span>
            )}
            {tc.status === "running" && (
              <Icons.Loader2 className="animate-spin" size={8} />
            )}
          </span>
        );
      })}
    </div>
  );
});

export { toolCallBadgeVariants };
