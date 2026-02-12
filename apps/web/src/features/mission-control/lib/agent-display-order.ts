import type { MissionAgentLaneState } from "@openplane/types/mission-control";

const STATUS_PRIORITY: Record<MissionAgentLaneState["status"], number> = {
  running: 0,
  blocked: 1,
  failed: 2,
  idle: 3,
  completed: 4,
};

export function sortAgentsForDisplay(
  agents: MissionAgentLaneState[]
): MissionAgentLaneState[] {
  return [...agents].sort((a, b) => {
    const statusDelta = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const aLast = a.lastActivityAt ?? 0;
    const bLast = b.lastActivityAt ?? 0;
    if (aLast !== bLast) {
      return bLast - aLast;
    }

    if (a.costCents !== b.costCents) {
      return b.costCents - a.costCents;
    }

    return a.agentName.localeCompare(b.agentName);
  });
}
