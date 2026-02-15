import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMissionActivities } from "../activities/mission";
import type { MissionActivities } from "../activities/mission/types";

function createMockDb() {
  return {
    missionTask: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    missionAgent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    missionRun: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    missionComment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    missionActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    missionMemory: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    mission: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    backgroundAgent: {
      create: vi.fn(),
    },
  };
}

describe("browseInbox", () => {
  let db: ReturnType<typeof createMockDb>;
  let activities: MissionActivities;

  beforeEach(() => {
    db = createMockDb();
    activities = createMissionActivities({
      db: db as never,
    });
  });

  it("returns unassigned INBOX tasks ordered by priority", async () => {
    db.missionTask.findMany.mockResolvedValue([
      {
        id: "t1",
        title: "Critical fix",
        description: "Fix ASAP",
        priority: "P0",
        requiredCapabilities: ["debugging"],
        dependsOn: [],
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "t2",
        title: "Add feature",
        description: null,
        priority: "P2",
        requiredCapabilities: [],
        dependsOn: [],
        createdAt: new Date("2026-01-02"),
      },
    ]);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]?.id).toBe("t1");
    expect(result.tasks[0]?.priority).toBe("P0");
    expect(result.tasks[1]?.id).toBe("t2");
    expect(db.missionTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          missionId: "m1",
          status: "INBOX",
          assigneeId: null,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      })
    );
  });

  it("filters out tasks with unmet dependencies", async () => {
    db.missionTask.findMany
      .mockResolvedValueOnce([
        {
          id: "t1",
          title: "Independent",
          description: null,
          priority: "P0",
          requiredCapabilities: [],
          dependsOn: [],
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "t2",
          title: "Blocked",
          description: null,
          priority: "P1",
          requiredCapabilities: [],
          dependsOn: ["dep-1"],
          createdAt: new Date("2026-01-02"),
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.id).toBe("t1");
  });

  it("includes tasks with all dependencies completed", async () => {
    db.missionTask.findMany
      .mockResolvedValueOnce([
        {
          id: "t1",
          title: "Depends on dep-1",
          description: null,
          priority: "P0",
          requiredCapabilities: [],
          dependsOn: ["dep-1"],
          createdAt: new Date("2026-01-01"),
        },
      ])
      .mockResolvedValueOnce([{ id: "dep-1" }]);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.id).toBe("t1");
  });

  it("respects limit parameter", async () => {
    const tasks = Array.from({ length: 15 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      description: null,
      priority: "P2",
      requiredCapabilities: [],
      dependsOn: [],
      createdAt: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`),
    }));
    db.missionTask.findMany.mockResolvedValue(tasks);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
      limit: 5,
    });

    expect(result.tasks).toHaveLength(5);
  });

  it("clamps limit to 20 maximum", async () => {
    db.missionTask.findMany.mockResolvedValue([]);

    await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
      limit: 50,
    });

    expect(db.missionTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 40,
      })
    );
  });

  it("returns empty array when no tasks available", async () => {
    db.missionTask.findMany.mockResolvedValue([]);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(result.tasks).toHaveLength(0);
  });

  it("converts createdAt to epoch milliseconds", async () => {
    const fixedDate = new Date("2026-06-15T12:00:00.000Z");
    db.missionTask.findMany.mockResolvedValue([
      {
        id: "t1",
        title: "Task",
        description: null,
        priority: "P1",
        requiredCapabilities: [],
        dependsOn: [],
        createdAt: fixedDate,
      },
    ]);

    const result = await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(result.tasks[0]?.createdAt).toBe(fixedDate.getTime());
  });

  it("skips dependency check when no tasks have dependencies", async () => {
    db.missionTask.findMany.mockResolvedValue([
      {
        id: "t1",
        title: "A",
        description: null,
        priority: "P0",
        requiredCapabilities: [],
        dependsOn: [],
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await activities.browseInbox({
      missionId: "m1",
      agentId: "a1",
    });

    expect(db.missionTask.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("validateAgentClaim", () => {
  let db: ReturnType<typeof createMockDb>;
  let activities: MissionActivities;

  beforeEach(() => {
    db = createMockDb();
    activities = createMissionActivities({
      db: db as never,
    });
  });

  it("approves valid claim", async () => {
    db.missionTask.findFirst.mockResolvedValue({ id: "t1" });
    db.missionAgent.findFirst.mockResolvedValue({ id: "a1" });

    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 1,
      maxConcurrentRuns: 3,
      consumedCents: 100,
      budgetCents: 500,
    });

    expect(result.approved).toBe(true);
    expect(result.reason).toBe("Claim approved");
  });

  it("rejects when budget exhausted", async () => {
    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 0,
      maxConcurrentRuns: 3,
      consumedCents: 500,
      budgetCents: 500,
    });

    expect(result.approved).toBe(false);
    expect(result.reason).toBe("Mission budget exhausted");
  });

  it("rejects when concurrency limit reached", async () => {
    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 3,
      maxConcurrentRuns: 3,
      consumedCents: 0,
    });

    expect(result.approved).toBe(false);
    expect(result.reason).toContain("Concurrency limit reached");
  });

  it("rejects when task not available", async () => {
    db.missionTask.findFirst.mockResolvedValue(null);

    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 0,
      maxConcurrentRuns: 3,
      consumedCents: 0,
    });

    expect(result.approved).toBe(false);
    expect(result.reason).toBe("Task not available for claiming");
  });

  it("rejects when agent not in mission roster", async () => {
    db.missionTask.findFirst.mockResolvedValue({ id: "t1" });
    db.missionAgent.findFirst.mockResolvedValue(null);

    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "unknown-agent",
      taskId: "t1",
      currentRunningAgents: 0,
      maxConcurrentRuns: 3,
      consumedCents: 0,
    });

    expect(result.approved).toBe(false);
    expect(result.reason).toBe("Agent not found in mission roster");
  });

  it("approves when no budget limit set", async () => {
    db.missionTask.findFirst.mockResolvedValue({ id: "t1" });
    db.missionAgent.findFirst.mockResolvedValue({ id: "a1" });

    const result = await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 0,
      maxConcurrentRuns: 3,
      consumedCents: 999_999,
    });

    expect(result.approved).toBe(true);
  });

  it("queries task with correct status and ownership filters", async () => {
    db.missionTask.findFirst.mockResolvedValue({ id: "t1" });
    db.missionAgent.findFirst.mockResolvedValue({ id: "a1" });

    await activities.validateAgentClaim({
      missionId: "m1",
      agentId: "a1",
      taskId: "t1",
      currentRunningAgents: 0,
      maxConcurrentRuns: 3,
      consumedCents: 0,
    });

    expect(db.missionTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "t1",
        missionId: "m1",
        status: "INBOX",
        assigneeId: null,
      },
      select: { id: true },
    });
  });
});
