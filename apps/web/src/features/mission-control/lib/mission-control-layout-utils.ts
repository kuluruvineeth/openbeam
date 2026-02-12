import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

function matchesAgentFilter(
  event: MissionEventLedgerItem,
  selectedAgentId: string,
  selectedAgentName: string | null
): boolean {
  return (
    event.payload?.agentId === selectedAgentId ||
    (selectedAgentName !== null && event.agentName === selectedAgentName)
  );
}

export function filterEventsForSelectedAgent(
  allEvents: MissionEventLedgerItem[],
  selectedAgentId: string | null,
  selectedAgentName: string | null
): MissionEventLedgerItem[] {
  if (!selectedAgentId) {
    return allEvents;
  }

  return allEvents.filter((event) =>
    matchesAgentFilter(event, selectedAgentId, selectedAgentName)
  );
}
