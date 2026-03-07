"use client";

import type { ControlAgentStatusCounts } from "@openbeam/types/control";
import { MetricCard } from "../shared/metric-card";

type AgentsSummaryProps = {
  agents: ControlAgentStatusCounts;
};

export function AgentsSummary({ agents }: AgentsSummaryProps) {
  const detail = [
    agents.running > 0 && `${agents.running} running`,
    agents.error > 0 && `${agents.error} errors`,
    agents.paused > 0 && `${agents.paused} paused`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <MetricCard
      detail={detail || `${agents.idle} idle`}
      label="Agents"
      value={agents.active}
    />
  );
}
