import { describe, expect, it } from "bun:test";
import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { createMockEvent } from "../../__tests__/test-helpers";
import {
  buildStateSections,
  buildTerminalIndex,
  classifyEventBucket,
  sortEventsByTimestampDesc,
} from "../../lib/timeline-state";

function createEvent(
  overrides: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return createMockEvent(overrides);
}

describe("sortEventsByTimestampDesc", () => {
  it("sorts events by descending timestamp", () => {
    const events = [
      createEvent({ eventId: "e1", timestamp: 1000 }),
      createEvent({ eventId: "e2", timestamp: 3000 }),
      createEvent({ eventId: "e3", timestamp: 2000 }),
    ];

    const result = sortEventsByTimestampDesc(events);

    expect(result.map((event) => event.eventId)).toEqual(["e2", "e3", "e1"]);
  });
});

describe("classifyEventBucket", () => {
  it("marks unresolved run.started as running_now", () => {
    const started = createEvent({
      eventId: "run-started",
      eventType: "run.started",
      timestamp: 2000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([started]);

    expect(classifyEventBucket(started, index, 2000)).toBe("running_now");
  });

  it("marks run.started with a terminal as earlier", () => {
    const started = createEvent({
      eventId: "run-started",
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const completed = createEvent({
      eventId: "run-completed",
      eventType: "run.completed",
      timestamp: 2000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([completed, started]);

    expect(classifyEventBucket(started, index, 2000)).toBe("earlier");
  });

  it("marks failed events as needs_attention", () => {
    const failed = createEvent({
      eventId: "run-failed",
      eventType: "run.failed",
      timestamp: 3000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([failed]);

    expect(classifyEventBucket(failed, index, 3000)).toBe("needs_attention");
  });

  it("does not mark stale dispatch events as running_now", () => {
    const now = Date.now();
    const dispatched = createEvent({
      eventId: "dispatch-stale",
      eventType: "agent_dispatched",
      timestamp: now - 10 * 60 * 1000,
      payload: { agentId: "agent-1", taskId: "task-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([dispatched]);

    expect(classifyEventBucket(dispatched, index, now)).toBe("earlier");
  });

  it("marks recent dispatch events as running_now", () => {
    const now = Date.now();
    const dispatched = createEvent({
      eventId: "dispatch-recent",
      eventType: "agent_dispatched",
      timestamp: now - 30 * 1000,
      payload: { agentId: "agent-1", taskId: "task-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([dispatched]);

    expect(classifyEventBucket(dispatched, index, now)).toBe("running_now");
  });

  it("does not mark dispatch as running after mission completion", () => {
    const now = Date.now();
    const dispatched = createEvent({
      eventId: "dispatch-recent",
      eventType: "agent_dispatched",
      timestamp: now - 30 * 1000,
      payload: { agentId: "agent-1", taskId: "task-1" },
      agentName: "Agent 1",
    });
    const missionCompleted = createEvent({
      eventId: "mission-completed",
      eventType: "mission.completed",
      timestamp: now - 10 * 1000,
    });
    const index = buildTerminalIndex([missionCompleted, dispatched]);

    expect(classifyEventBucket(dispatched, index, now)).toBe("earlier");
  });

  it("does not keep run.started in running_now after mission terminal event", () => {
    const started = createEvent({
      eventId: "run-started",
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const missionCompleted = createEvent({
      eventId: "mission-completed",
      eventType: "mission.completed",
      timestamp: 2000,
    });
    const index = buildTerminalIndex([missionCompleted, started]);

    expect(classifyEventBucket(started, index, 2500)).toBe("earlier");
  });

  it("treats running events as earlier when mission is already settled", () => {
    const now = Date.now();
    const started = createEvent({
      eventId: "run-started",
      eventType: "run.started",
      timestamp: now - 1000,
      payload: { agentId: "agent-1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([started]);

    expect(classifyEventBucket(started, index, now, true)).toBe("earlier");
  });
});

describe("state sections", () => {
  it("builds ordered state sections from timeline rows", () => {
    const rows = [
      { bucket: "needs_attention" as const, id: "attention" },
      { bucket: "running_now" as const, id: "running" },
      { bucket: "active_reflections" as const, id: "reflection" },
      { bucket: "recently_completed" as const, id: "completed" },
      { bucket: "earlier" as const, id: "earlier" },
    ];
    const sections = buildStateSections(rows);

    expect(sections.map((section) => section.bucket)).toEqual([
      "running_now",
      "active_reflections",
      "needs_attention",
      "recently_completed",
      "earlier",
    ]);
    expect(
      sections.find((section) => section.bucket === "needs_attention")?.rows
        .length
    ).toBe(1);
    expect(
      sections.find((section) => section.bucket === "running_now")?.rows.length
    ).toBe(1);
    expect(
      sections.find((section) => section.bucket === "active_reflections")?.rows
        .length
    ).toBe(1);
    expect(
      sections.find((section) => section.bucket === "recently_completed")?.rows
        .length
    ).toBe(1);
  });
});
