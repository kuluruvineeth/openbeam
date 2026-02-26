"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AggregatedAgent } from "../hooks/use-aggregated-agents";
import { useAllAgentsList } from "../hooks/use-all-agents-list";
import {
  buildDaemonAgentDetailRoute,
  daemonNavigate,
} from "../lib/host-routes";
import { shortenPath } from "../lib/shorten-path";
import { AgentStatusDot } from "./agent-status-dot";

type DateSectionLabel =
  | "Today"
  | "Yesterday"
  | "This week"
  | "This month"
  | "Older";

function deriveDateSectionLabel(lastActivityAt: Date | null): DateSectionLabel {
  if (!lastActivityAt) {
    return "Older";
  }
  const now = new Date();
  const diffMs = now.getTime() - lastActivityAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return "This week";
  }
  if (diffDays < 30) {
    return "This month";
  }
  return "Older";
}

interface AgentSection {
  label: DateSectionLabel;
  agents: AggregatedAgent[];
}

function buildSections(agents: AggregatedAgent[]): AgentSection[] {
  const sections: AgentSection[] = [];
  let currentLabel: DateSectionLabel | null = null;
  let currentAgents: AggregatedAgent[] = [];

  for (const agent of agents) {
    const label = deriveDateSectionLabel(agent.lastActivityAt);
    if (label !== currentLabel) {
      if (currentLabel !== null && currentAgents.length > 0) {
        sections.push({ label: currentLabel, agents: currentAgents });
      }
      currentLabel = label;
      currentAgents = [];
    }
    currentAgents.push(agent);
  }

  if (currentLabel !== null && currentAgents.length > 0) {
    sections.push({ label: currentLabel, agents: currentAgents });
  }

  return sections;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AgentListRow({
  agent,
  onSelect,
}: {
  agent: AggregatedAgent;
  onSelect: (agent: AggregatedAgent) => void;
}) {
  const title = agent.title ?? "New agent";
  const path = shortenPath(agent.cwd);

  return (
    <button
      className="flex w-full items-start gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
      onClick={() => onSelect(agent)}
      type="button"
    >
      <span className="mt-1.5 flex size-4 items-center justify-center">
        <AgentStatusDot
          requiresAttention={agent.requiresAttention}
          showInactive
          status={agent.status}
        />
      </span>
      <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-medium text-foreground text-sm">
          {title}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <span className="truncate">{path}</span>
          <span className="text-border">·</span>
          <span className="shrink-0">
            {agent.lastActivityAt ? formatTimeAgo(agent.lastActivityAt) : ""}
          </span>
        </span>
      </span>
    </button>
  );
}

export function AgentList({ serverId }: { serverId: string }) {
  const router = useRouter();
  const { agents } = useAllAgentsList({ serverId });

  const sorted = useMemo(() => {
    const copy = [...agents];
    copy.sort((a, b) => {
      if (a.requiresAttention !== b.requiresAttention) {
        return a.requiresAttention ? -1 : 1;
      }
      return (
        (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0)
      );
    });
    return copy;
  }, [agents]);

  const sections = useMemo(() => buildSections(sorted), [sorted]);

  const handleSelect = useCallback(
    (agent: AggregatedAgent) => {
      daemonNavigate(
        router,
        buildDaemonAgentDetailRoute(agent.serverId, agent.id)
      );
    },
    [router]
  );

  if (agents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No agents found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sections.map((section) => (
        <div className="py-1" key={section.label}>
          <div className="px-3 py-1.5 font-medium text-muted-foreground/60 text-xs uppercase tracking-wider">
            {section.label}
          </div>
          {section.agents.map((agent) => (
            <AgentListRow
              agent={agent}
              key={`${agent.serverId}:${agent.id}`}
              onSelect={handleSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
