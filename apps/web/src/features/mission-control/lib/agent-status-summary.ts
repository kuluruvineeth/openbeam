import type { MissionAgentLaneState } from "@openplane/types/mission-control";

export type AgentStatusSummary = {
  running: number;
  blocked: number;
  completed: number;
  failed: number;
  idle: number;
  spawned: number;
  reflecting: number;
};

export function summarizeAgentStatuses(
  agents: MissionAgentLaneState[]
): AgentStatusSummary {
  let running = 0;
  let blocked = 0;
  let completed = 0;
  let failed = 0;
  let idle = 0;
  let spawned = 0;
  let reflecting = 0;

  for (const agent of agents) {
    if (agent.spawnedBy) {
      spawned += 1;
    }
    if (agent.isReflecting) {
      reflecting += 1;
    }

    switch (agent.status) {
      case "running":
        running += 1;
        break;
      case "blocked":
        blocked += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "completed":
        completed += 1;
        break;
      default:
        idle += 1;
        break;
    }
  }

  return { running, blocked, completed, failed, idle, spawned, reflecting };
}
