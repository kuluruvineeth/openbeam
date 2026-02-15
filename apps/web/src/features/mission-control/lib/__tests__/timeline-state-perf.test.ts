import { describe, expect, it } from "bun:test";
import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { createMockEvent } from "../../__tests__/test-helpers";
import { buildTerminalIndex, classifyEventBucket } from "../timeline-state";

function createEvent(
  overrides: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return createMockEvent(overrides);
}

describe("buildTerminalIndex", () => {
  it("indexes terminal events by scope", () => {
    const events = [
      createEvent({
        eventType: "run.started",
        timestamp: 1000,
        payload: { agentId: "a1" },
      }),
      createEvent({
        eventType: "run.completed",
        timestamp: 2000,
        payload: { agentId: "a1" },
      }),
      createEvent({
        eventType: "tool.started",
        timestamp: 1500,
        payload: { toolCallId: "t1", agentId: "a1" },
      }),
      createEvent({
        eventType: "tool.completed",
        timestamp: 1800,
        payload: { toolCallId: "t1", agentId: "a1" },
      }),
    ];

    const index = buildTerminalIndex(events);

    expect(index.byScope.get("run.started:agentId:a1")).toBe(2000);
    expect(index.byScope.get("tool.started:toolCallId:t1")).toBe(1800);
    expect(index.missionTerminal).toBeNull();
  });

  it("tracks mission terminal timestamp", () => {
    const events = [
      createEvent({ eventType: "run.started", timestamp: 1000 }),
      createEvent({ eventType: "mission.completed", timestamp: 5000 }),
    ];

    const index = buildTerminalIndex(events);

    expect(index.missionTerminal).toBe(5000);
  });

  it("uses latest mission terminal when multiple exist", () => {
    const events = [
      createEvent({ eventType: "mission.failed", timestamp: 3000 }),
      createEvent({ eventType: "mission.completed", timestamp: 5000 }),
    ];

    const index = buildTerminalIndex(events);

    expect(index.missionTerminal).toBe(5000);
  });
});

describe("isRunningEvent via classifyEventBucket", () => {
  it("returns running_now for open events without matching terminal", () => {
    const started = createEvent({
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "a1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([started]);

    expect(classifyEventBucket(started, index, 2000)).toBe("running_now");
  });

  it("returns earlier when terminal exists at later timestamp", () => {
    const started = createEvent({
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "a1" },
      agentName: "Agent 1",
    });
    const completed = createEvent({
      eventType: "run.completed",
      timestamp: 2000,
      payload: { agentId: "a1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([started, completed]);

    expect(classifyEventBucket(started, index, 3000)).toBe("earlier");
  });

  it("scopes terminals by agentId", () => {
    const startedA1 = createEvent({
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "a1" },
      agentName: "Agent 1",
    });
    const startedA2 = createEvent({
      eventType: "run.started",
      timestamp: 1000,
      payload: { agentId: "a2" },
      agentName: "Agent 2",
    });
    const completedA1 = createEvent({
      eventType: "run.completed",
      timestamp: 2000,
      payload: { agentId: "a1" },
      agentName: "Agent 1",
    });
    const index = buildTerminalIndex([startedA1, startedA2, completedA1]);

    expect(classifyEventBucket(startedA1, index, 3000)).toBe("earlier");
    expect(classifyEventBucket(startedA2, index, 3000)).toBe("running_now");
  });
});

describe("performance", () => {
  it("classifies 10K events in < 50ms", () => {
    const eventTypes = [
      "run.started",
      "run.completed",
      "agent_dispatched",
      "tool.started",
      "tool.completed",
      "agent_run_started",
      "agent_run_completed",
      "task.claimed",
      "task.completed",
      "agent_step_completed",
    ];
    const events: MissionEventLedgerItem[] = [];
    const agentCount = 20;

    for (let i = 0; i < 10_000; i++) {
      const agentId = `agent-${i % agentCount}`;
      events.push(
        createEvent({
          eventType: eventTypes[i % eventTypes.length],
          timestamp: 1000 + i * 10,
          payload: { agentId },
          agentName: `Agent ${i % agentCount}`,
          sequence: i,
        })
      );
    }

    const start = performance.now();
    const index = buildTerminalIndex(events);
    const lastEvent = events.at(-1);
    const referenceTimestamp = (lastEvent?.timestamp ?? 0) + 1000;

    for (const event of events) {
      classifyEventBucket(event, index, referenceTimestamp);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
