import type { MissionAgentLaneState } from "@openplane/types/mission-control";

export type RuntimePulse = "live" | "attention" | "done" | "idle";

export type AgentStatusSummary = {
  total: number;
  active: number;
  running: number;
  blocked: number;
  completed: number;
  failed: number;
};

export type AgentHeaderMetric = {
  label: "Active" | "Done" | "Settled";
  value: string;
};

function formatAgentMetricValue(value: number, total: number): string {
  return total > 0 ? `${value}/${total}` : "0";
}

export function summarizeMissionAgentStatuses(
  agentBoard: Record<string, MissionAgentLaneState>
): AgentStatusSummary {
  const initial: AgentStatusSummary = {
    total: 0,
    active: 0,
    running: 0,
    blocked: 0,
    completed: 0,
    failed: 0,
  };

  return Object.values(agentBoard).reduce<AgentStatusSummary>((acc, agent) => {
    acc.total += 1;

    if (agent.status === "running") {
      acc.running += 1;
      acc.active += 1;
    }
    if (agent.status === "blocked") {
      acc.blocked += 1;
      acc.active += 1;
    }
    if (agent.status === "completed") {
      acc.completed += 1;
    }
    if (agent.status === "failed") {
      acc.failed += 1;
    }

    return acc;
  }, initial);
}

export function deriveRuntimePulse(
  missionStatus: string,
  agentStatus: AgentStatusSummary,
  pendingApprovals: number
): RuntimePulse {
  const isTerminal = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
    missionStatus
  );

  if (isTerminal) {
    return "done";
  }
  if (
    pendingApprovals > 0 ||
    agentStatus.blocked > 0 ||
    agentStatus.failed > 0
  ) {
    return "attention";
  }
  if (agentStatus.running > 0) {
    return "live";
  }
  if (
    agentStatus.completed > 0 &&
    agentStatus.completed === agentStatus.total
  ) {
    return "done";
  }
  return "idle";
}

export function deriveAgentHeaderMetric(
  missionStatus: string,
  agentStatus: AgentStatusSummary
): AgentHeaderMetric {
  const total = agentStatus.total;
  if (missionStatus === "COMPLETED") {
    return {
      label: "Done",
      value: formatAgentMetricValue(agentStatus.completed, total),
    };
  }

  if (missionStatus === "CANCELLED" || missionStatus === "ARCHIVED") {
    const settled = agentStatus.completed + agentStatus.failed;
    return {
      label: "Settled",
      value: formatAgentMetricValue(settled, total),
    };
  }

  return {
    label: "Active",
    value: formatAgentMetricValue(agentStatus.active, total),
  };
}
