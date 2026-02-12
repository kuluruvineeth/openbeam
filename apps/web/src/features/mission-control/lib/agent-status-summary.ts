import type { MissionAgentLaneState } from "@openplane/types/mission-control";

export type AgentStatusSummary = {
  running: number;
  blocked: number;
  completed: number;
  failed: number;
};

export function summarizeAgentStatuses(
  agents: MissionAgentLaneState[]
): AgentStatusSummary {
  let running = 0;
  let blocked = 0;
  let completed = 0;
  let failed = 0;

  for (const agent of agents) {
    if (agent.status === "running") {
      running += 1;
    }
    if (agent.status === "blocked") {
      blocked += 1;
    }
    if (agent.status === "completed") {
      completed += 1;
    }
    if (agent.status === "failed") {
      failed += 1;
    }
  }

  return { running, blocked, completed, failed };
}
