import { describe, expect, it } from "bun:test";
import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { createMockEvent } from "../../__tests__/test-helpers";
import { deriveMissionOutcome } from "../mission-outcome";

function createEvent(
  overrides: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return createMockEvent(overrides);
}

describe("deriveMissionOutcome", () => {
  it("prefers latest artifact.published event", () => {
    const outcome = deriveMissionOutcome([
      createEvent({
        eventId: "mission-completed",
        eventType: "mission.completed",
        timestamp: 1000,
        summary: "Mission completed",
      }),
      createEvent({
        eventId: "artifact",
        eventType: "artifact.published",
        timestamp: 2000,
        agentName: "Strategy Synthesizer",
        payload: {
          artifactId: "artifact-1",
          artifactTitle: "Strategic Brief",
        },
      }),
    ]);

    expect(outcome).not.toBeNull();
    expect(outcome?.source).toBe("artifact");
    expect(outcome?.title).toBe("Strategic Brief");
    expect(outcome?.artifactId).toBe("artifact-1");
    expect(outcome?.subtitle).toContain("Strategy Synthesizer");
  });

  it("falls back to mission completion when no artifact exists", () => {
    const outcome = deriveMissionOutcome([
      createEvent({
        eventId: "mission-completed",
        eventType: "mission.completed",
        timestamp: 1000,
        summary: "Mission completed",
      }),
    ]);

    expect(outcome).not.toBeNull();
    expect(outcome?.source).toBe("completion");
    expect(outcome?.title).toBe("Mission completed");
  });

  it("uses latest step output when no artifact.published exists", () => {
    const outcome = deriveMissionOutcome([
      createEvent({
        eventId: "step-output",
        eventType: "agent_step_completed",
        timestamp: 1500,
        agentName: "Strategy Synthesizer",
        payload: {
          content: "Strategic summary for the mission\nwith details",
        },
      }),
      createEvent({
        eventId: "mission-completed",
        eventType: "mission.completed",
        timestamp: 2000,
        summary: "Mission completed",
      }),
    ]);

    expect(outcome).not.toBeNull();
    expect(outcome?.source).toBe("completion");
    expect(outcome?.title).toContain("Strategic summary");
    expect(outcome?.subtitle).toContain("Strategy Synthesizer");
  });

  it("returns null when no completion or artifact events exist", () => {
    const outcome = deriveMissionOutcome([
      createEvent({
        eventId: "run-started",
        eventType: "run.started",
        timestamp: 1000,
      }),
    ]);

    expect(outcome).toBeNull();
  });
});
