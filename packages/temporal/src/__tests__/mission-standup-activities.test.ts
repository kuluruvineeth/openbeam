import type { StandupReport } from "@openplane/types/temporal/mission-reflection";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReflectionActivities } from "../activities/mission/reflection";

function createMockDb() {
  return {
    missionRun: { findMany: vi.fn() },
    missionMemory: { findUnique: vi.fn(), upsert: vi.fn() },
    missionTask: { findMany: vi.fn(), update: vi.fn() },
    missionComment: { create: vi.fn() },
  };
}

function makeReport(overrides: Partial<StandupReport> = {}): StandupReport {
  return {
    agentId: "agent-1",
    agentName: "Researcher",
    taskId: "task-1",
    taskTitle: "Research competitors",
    status: "on_track",
    progressSummary: "Making progress",
    blockers: [],
    nextSteps: ["Continue research"],
    requestsHelp: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("synthesizeStandup", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns healthy when all agents are on track with no missed agents", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-1",
      reports: [
        makeReport({ agentId: "a1", taskId: "t1", status: "on_track" }),
        makeReport({ agentId: "a2", taskId: "t2", status: "completed" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("healthy");
    expect(summary.conflicts).toHaveLength(0);
    expect(summary.actionItems).toHaveLength(0);
    expect(summary.missedAgents).toHaveLength(0);
  });

  it("returns degraded when some agents are blocked", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-2",
      reports: [
        makeReport({ agentId: "a1", status: "on_track" }),
        makeReport({
          agentId: "a2",
          agentName: "Writer",
          status: "blocked",
          blockers: ["Waiting on data"],
        }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("degraded");
    expect(summary.actionItems).toContain("Unblock Writer: Waiting on data");
  });

  it("returns degraded when there are missed agents", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-3",
      reports: [makeReport({ agentId: "a1", status: "on_track" })],
      missedAgentIds: ["a2"],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("degraded");
    expect(summary.actionItems).toContain("Check on unresponsive agent a2");
    expect(summary.missedAgents).toEqual(["a2"]);
  });

  it("returns critical when majority of agents are blocked", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-4",
      reports: [
        makeReport({
          agentId: "a1",
          status: "blocked",
          blockers: ["API down"],
        }),
        makeReport({ agentId: "a2", status: "blocked", blockers: ["No data"] }),
        makeReport({ agentId: "a3", status: "on_track" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("critical");
  });

  it("detects duplicate work conflicts", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-5",
      reports: [
        makeReport({
          agentId: "a1",
          agentName: "Alpha",
          taskId: "shared-task",
          taskTitle: "Write docs",
        }),
        makeReport({
          agentId: "a2",
          agentName: "Beta",
          taskId: "shared-task",
          taskTitle: "Write docs",
        }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.conflicts).toHaveLength(1);
    expect(summary.conflicts[0]?.type).toBe("duplicate_work");
    expect(summary.conflicts[0]?.agentIds).toEqual(["a1", "a2"]);
    expect(summary.conflicts[0]?.description).toContain("Write docs");
    expect(summary.conflicts[0]?.suggestedResolution).toBe(
      "Reassign one agent to different task"
    );
  });

  it("includes conflict resolutions in action items", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-6",
      reports: [
        makeReport({ agentId: "a1", taskId: "t1" }),
        makeReport({ agentId: "a2", taskId: "t1" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.actionItems).toContain(
      "Reassign one agent to different task"
    );
  });

  it("treats requestsHelp as a blocked indicator for health", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-7",
      reports: [
        makeReport({
          agentId: "a1",
          agentName: "Helper",
          taskId: "t1",
          status: "needs_help",
          requestsHelp: true,
          blockers: ["Complex task"],
        }),
        makeReport({ agentId: "a2", taskId: "t2", status: "on_track" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("degraded");
    expect(summary.actionItems).toContain("Unblock Helper: Complex task");
  });

  it("handles empty reports with missed agents", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-8",
      reports: [],
      missedAgentIds: ["a1", "a2"],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("degraded");
    expect(summary.conflicts).toHaveLength(0);
    expect(summary.actionItems).toHaveLength(2);
    expect(summary.reports).toHaveLength(0);
  });

  it("preserves roundId and missionId in summary", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "mission-42",
      roundId: "standup-99",
      reports: [makeReport()],
      missedAgentIds: [],
      missionObjective: "Ship feature",
    });

    expect(summary.roundId).toBe("standup-99");
    expect(summary.missionId).toBe("mission-42");
    expect(summary.timestamp).toBeGreaterThan(0);
  });

  it("returns healthy for all completed agents", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-10",
      reports: [
        makeReport({ agentId: "a1", status: "completed" }),
        makeReport({ agentId: "a2", status: "completed" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("healthy");
  });

  it("detects multiple duplicate work conflicts across different tasks", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-11",
      reports: [
        makeReport({ agentId: "a1", taskId: "t1", taskTitle: "Task A" }),
        makeReport({ agentId: "a2", taskId: "t1", taskTitle: "Task A" }),
        makeReport({ agentId: "a3", taskId: "t2", taskTitle: "Task B" }),
        makeReport({ agentId: "a4", taskId: "t2", taskTitle: "Task B" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.conflicts).toHaveLength(2);
    expect(summary.conflicts[0]?.agentIds).toEqual(["a1", "a2"]);
    expect(summary.conflicts[1]?.agentIds).toEqual(["a3", "a4"]);
  });

  it("aggregates all three types of action items", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-12",
      reports: [
        makeReport({
          agentId: "a1",
          agentName: "Blocked",
          status: "blocked",
          blockers: ["DB down"],
          taskId: "t1",
        }),
        makeReport({
          agentId: "a2",
          taskId: "t1",
        }),
      ],
      missedAgentIds: ["a3"],
      missionObjective: "Build product",
    });

    expect(summary.actionItems).toEqual([
      "Unblock Blocked: DB down",
      "Check on unresponsive agent a3",
      "Reassign one agent to different task",
    ]);
  });

  it("returns healthy when only idle agents and no missed", async () => {
    const activities = createReflectionActivities({ db: db as never });

    const { summary } = await activities.synthesizeStandup({
      missionId: "m1",
      roundId: "standup-13",
      reports: [
        makeReport({ agentId: "a1", status: "idle" }),
        makeReport({ agentId: "a2", status: "idle" }),
      ],
      missedAgentIds: [],
      missionObjective: "Build product",
    });

    expect(summary.overallHealth).toBe("healthy");
  });
});
