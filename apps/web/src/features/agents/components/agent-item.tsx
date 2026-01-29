"use client";

import type { AgentCanvasSettings } from "@openplane/types/canvas";
import { Badge } from "@openplane/ui/components/badge";
import { cn } from "@openplane/ui/utils";
import Link from "next/link";
import { useMemo } from "react";
import { AgentCapabilityBadges } from "./agent-capability-badges";
import { AgentItemActions } from "./agent-item-actions";
import { AgentItemTags } from "./agent-item-tags";

function parseIcon(icon: string | null): { emoji: string; color: string } {
  if (!icon) {
    return { emoji: "🤖", color: "#3b82f6" };
  }
  const parts = icon.split("|");
  if (parts.length === 2) {
    return { emoji: parts[0] || "🤖", color: parts[1] || "#3b82f6" };
  }
  return { emoji: icon || "🤖", color: "#3b82f6" };
}

type AgentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type AgentItemData = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: AgentStatus;
  version: number;
  settings?: AgentCanvasSettings | null;
  tags?: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
};

type AgentItemProps = {
  data: AgentItemData;
  small?: boolean;
};

const statusConfig: Record<AgentStatus, { label: string; className: string }> =
  {
    DRAFT: { label: "Draft", className: "bg-secondary text-muted-foreground" },
    PUBLISHED: {
      label: "Published",
      className: "bg-primary text-primary-foreground",
    },
    ARCHIVED: {
      label: "Archived",
      className: "bg-muted text-muted-foreground",
    },
  };

export function AgentItem({ data, small }: AgentItemProps) {
  const statusInfo = statusConfig[data.status];
  const { emoji, color } = useMemo(() => parseIcon(data.icon), [data.icon]);

  return (
    <Link href={`/agents/${data.id}`}>
      <div
        className={cn(
          "group relative flex h-72 cursor-pointer flex-col gap-3 border p-4 text-muted-foreground transition-colors duration-200 hover:bg-muted dark:hover:bg-accent",
          small && "h-48"
        )}
      >
        <div className="absolute top-4 right-4 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <AgentItemActions id={data.id} name={data.name} />
        </div>

        <div
          className={cn(
            "relative flex h-[84px] w-[60px] items-center justify-center rounded-md",
            small && "h-[63px] w-[45px]"
          )}
          style={{ backgroundColor: `${color}20` }}
        >
          <span className="text-3xl">{emoji}</span>
        </div>

        <div className="flex flex-1 flex-col text-left">
          <div className="mt-3 mb-2 flex items-center gap-2">
            <h2 className="line-clamp-1 text-primary text-sm">{data.name}</h2>
            <Badge
              className={cn(
                "shrink-0 rounded-full text-[10px]",
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>
          <p className="line-clamp-3 text-muted-foreground text-xs">
            {data.description}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          {data.settings?.agentConfig?.capabilities &&
            data.settings.agentConfig.capabilities.length > 0 && (
              <AgentCapabilityBadges
                capabilities={data.settings.agentConfig.capabilities}
                compact
                maxVisible={4}
              />
            )}
          <AgentItemTags tags={data.tags ?? []} version={data.version} />
        </div>
      </div>
    </Link>
  );
}

export type { AgentItemData, AgentItemProps };
