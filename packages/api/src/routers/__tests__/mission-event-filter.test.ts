import { describe, expect, it } from "bun:test";
import { shouldEmitEvent } from "../mission-control.utils";

function createEvent(overrides: {
  sequence?: number;
  eventType?: string;
  payload?: Record<string, unknown>;
}) {
  return {
    sequence: overrides.sequence ?? 0,
    eventType: overrides.eventType ?? "agent.step.completed",
    payload: overrides.payload ?? {},
  };
}

describe("shouldEmitEvent", () => {
  describe("without filters", () => {
    it("passes all events through", () => {
      const event = createEvent({ payload: { agentName: "Researcher" } });
      expect(shouldEmitEvent(event, {})).toBe(true);
    });

    it("passes events without agentName", () => {
      const event = createEvent({ eventType: "mission.started" });
      expect(shouldEmitEvent(event, {})).toBe(true);
    });
  });

  describe("agentName filter", () => {
    it("includes events matching the agent name", () => {
      const event = createEvent({
        payload: { agentName: "Researcher" },
      });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(true);
    });

    it("excludes events from a different agent", () => {
      const event = createEvent({
        payload: { agentName: "Writer" },
      });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(false);
    });

    it("excludes events with no agentName in payload", () => {
      const event = createEvent({
        eventType: "budget.updated",
        payload: { consumedCents: 50 },
      });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(false);
    });

    it("always includes mission.completed regardless of agent filter", () => {
      const event = createEvent({
        eventType: "mission.completed",
        payload: {},
      });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(true);
    });

    it("always includes mission.failed regardless of agent filter", () => {
      const event = createEvent({ eventType: "mission.failed", payload: {} });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(true);
    });

    it("always includes mission.cancelled regardless of agent filter", () => {
      const event = createEvent({
        eventType: "mission.cancelled",
        payload: {},
      });
      expect(shouldEmitEvent(event, { agentName: "Researcher" })).toBe(true);
    });
  });

  describe("since filter", () => {
    it("includes events at the since sequence", () => {
      const event = createEvent({ sequence: 100 });
      expect(shouldEmitEvent(event, { since: 100 })).toBe(true);
    });

    it("includes events after the since sequence", () => {
      const event = createEvent({ sequence: 150 });
      expect(shouldEmitEvent(event, { since: 100 })).toBe(true);
    });

    it("excludes events before the since sequence", () => {
      const event = createEvent({ sequence: 50 });
      expect(shouldEmitEvent(event, { since: 100 })).toBe(false);
    });
  });

  describe("combined filters", () => {
    it("applies both agentName and since together", () => {
      const matching = createEvent({
        sequence: 200,
        payload: { agentName: "Researcher" },
      });
      expect(
        shouldEmitEvent(matching, { agentName: "Researcher", since: 100 })
      ).toBe(true);
    });

    it("rejects when sequence is below since even if agent matches", () => {
      const event = createEvent({
        sequence: 50,
        payload: { agentName: "Researcher" },
      });
      expect(
        shouldEmitEvent(event, { agentName: "Researcher", since: 100 })
      ).toBe(false);
    });

    it("rejects when agent differs even if sequence passes", () => {
      const event = createEvent({
        sequence: 200,
        payload: { agentName: "Writer" },
      });
      expect(
        shouldEmitEvent(event, { agentName: "Researcher", since: 100 })
      ).toBe(false);
    });

    it("passes terminal events that fail the since filter", () => {
      const event = createEvent({
        sequence: 50,
        eventType: "mission.completed",
        payload: {},
      });
      expect(
        shouldEmitEvent(event, { agentName: "Researcher", since: 100 })
      ).toBe(false);
    });

    it("passes terminal events that pass the since filter with agent filter", () => {
      const event = createEvent({
        sequence: 200,
        eventType: "mission.completed",
        payload: {},
      });
      expect(
        shouldEmitEvent(event, { agentName: "Researcher", since: 100 })
      ).toBe(true);
    });
  });
});
