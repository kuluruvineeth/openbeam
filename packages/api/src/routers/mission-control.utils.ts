export type ActiveMissionRunCandidate = {
  id: string;
  agentId: string;
};

export function selectActiveMissionRunIdForAgent(
  runs: readonly ActiveMissionRunCandidate[],
  agentId: string
): string | null {
  for (const run of runs) {
    if (run.agentId === agentId) {
      return run.id;
    }
  }

  return null;
}

const TERMINAL_EVENT_TYPES = [
  "mission.completed",
  "mission.failed",
  "mission.cancelled",
];

type EventFilterInput = {
  agentName?: string;
  since?: number;
};

type FilterableEvent = {
  sequence: number;
  eventType: string;
  payload: Record<string, unknown>;
};

export function shouldEmitEvent(
  event: FilterableEvent,
  filter: EventFilterInput
): boolean {
  if (filter.since !== undefined && event.sequence < filter.since) {
    return false;
  }

  if (!filter.agentName) {
    return true;
  }

  if (TERMINAL_EVENT_TYPES.includes(event.eventType)) {
    return true;
  }

  const payloadAgentName = event.payload.agentName as string | undefined;
  return payloadAgentName === filter.agentName;
}
