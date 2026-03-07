"use client";

import type { ControlAgentStatus } from "@openbeam/types/control";
import Link from "next/link";
import { AgentAvatar } from "../shared/agent-avatar";
import { StatusBadge } from "../shared/status-badge";

type AgentListItem = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: ControlAgentStatus;
  adapterType: string;
  lastHeartbeatAt: Date | string | null;
};

type AgentCardProps = {
  agent: AgentListItem;
};

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      className="flex items-start gap-3 rounded-sm border border-border/50 p-3 transition-colors hover:border-border hover:bg-muted/50"
      href={`/control/agents/${agent.id}`}
    >
      <AgentAvatar name={agent.name} size="default" status={agent.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium text-sm">{agent.name}</p>
          <StatusBadge domain="agent" size="sm" status={agent.status} />
        </div>
        {agent.title && (
          <p className="truncate text-muted-foreground text-xs">
            {agent.title}
          </p>
        )}
        <p className="mt-1 text-muted-foreground text-xs capitalize">
          {agent.role}
        </p>
      </div>
    </Link>
  );
}
