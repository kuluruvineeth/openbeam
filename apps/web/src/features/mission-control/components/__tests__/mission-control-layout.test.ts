import { describe, expect, it } from "bun:test";
import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { createMockEvent } from "../../__tests__/test-helpers";
import { filterEventsForSelectedAgent } from "../../lib/mission-control-layout-utils";

function createEvent(
  overrides: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return createMockEvent(overrides);
}

describe("filterEventsForSelectedAgent", () => {
  const events = [
    createEvent({
      eventId: "evt-1",
      eventType: "run.started",
      agentName: "Agent A",
      payload: { agentId: "agent-a" },
    }),
    createEvent({
      eventId: "evt-2",
      eventType: "run.started",
      agentName: "Agent B",
      payload: { agentId: "agent-b" },
    }),
    createEvent({
      eventId: "evt-3",
      eventType: "approval.requested",
      agentName: "Agent A",
    }),
  ];

  it("returns all events when no agent is selected", () => {
    const result = filterEventsForSelectedAgent(events, null, null);
    expect(result).toHaveLength(3);
  });

  it("filters by payload agent id when selected", () => {
    const result = filterEventsForSelectedAgent(events, "agent-a", "Agent A");
    expect(result.map((event) => event.eventId)).toEqual(["evt-1", "evt-3"]);
  });

  it("falls back to agent name match when payload agent id is missing", () => {
    const result = filterEventsForSelectedAgent(events, "agent-a", "Agent A");
    expect(result.some((event) => event.eventId === "evt-3")).toBe(true);
  });
});
