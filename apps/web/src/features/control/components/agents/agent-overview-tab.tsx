"use client";

import type { ControlAgent } from "@openbeam/types/control";
import { formatDistanceToNow } from "date-fns";
import { useAgentRuns } from "../../hooks/use-control-heartbeats";
import { PropertiesPanel } from "../shared/properties-panel";
import { StatusBadge } from "../shared/status-badge";

type AgentOverviewTabProps = {
  agent: ControlAgent;
  agentId: string;
};

export function AgentOverviewTab({ agent, agentId }: AgentOverviewTabProps) {
  const { data: runs } = useAgentRuns(agentId, { limit: 5 });

  const properties = [
    { label: "Role", value: <span className="capitalize">{agent.role}</span> },
    { label: "Adapter", value: agent.adapterType },
    {
      label: "Last Heartbeat",
      value: agent.lastHeartbeatAt
        ? formatDistanceToNow(new Date(agent.lastHeartbeatAt), {
            addSuffix: true,
          })
        : "Never",
    },
    {
      label: "Budget",
      value: `$${(agent.budgetMonthlyCents / 100).toFixed(2)} / mo`,
    },
    {
      label: "Spent",
      value: `$${(agent.spentMonthlyCents / 100).toFixed(2)}`,
    },
    {
      label: "Created",
      value: formatDistanceToNow(new Date(agent.createdAt), {
        addSuffix: true,
      }),
    },
  ];

  if (agent.capabilities) {
    properties.push({ label: "Capabilities", value: agent.capabilities });
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <PropertiesPanel properties={properties} />

      <div className="space-y-3">
        <h3 className="font-medium text-sm">Recent Runs</h3>
        {!runs || runs.length === 0 ? (
          <p className="text-muted-foreground text-xs">No runs yet</p>
        ) : (
          <div className="space-y-1.5">
            {runs.slice(0, 5).map((run) => (
              <div
                className="flex items-center justify-between rounded-sm border border-border/50 px-3 py-2"
                key={run.id}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge domain="run" size="sm" status={run.status} />
                  <span className="text-muted-foreground text-xs">
                    {run.invocationSource}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(run.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
