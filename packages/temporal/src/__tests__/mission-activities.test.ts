import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMissionActivities } from "../activities/mission";
import type { MissionActivities } from "../activities/mission/types";

function createMockDb() {
  return {
    missionTask: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    missionAgent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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
  };
}

describe("Mission Activities", () => {
  let db: ReturnType<typeof createMockDb>;
  let activities: MissionActivities;

  beforeEach(() => {
    db = createMockDb();
    activities = createMissionActivities({ db: db as never });
  });

  describe("refreshQueue", () => {
    it("returns pending tasks ordered by priority", async () => {
      db.missionTask.findMany.mockResolvedValue([
        { id: "t1", title: "Fix bug", priority: "P0", assigneeId: null },
        { id: "t2", title: "Add feature", priority: "P2", assigneeId: null },
      ]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]?.id).toBe("t1");
      expect(db.missionTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            missionId: "m1",
            status: { in: ["INBOX", "ASSIGNED"] },
          },
        })
      );
    });

    it("returns empty array when no pending tasks", async () => {
      db.missionTask.findMany.mockResolvedValue([]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(0);
    });
  });

  describe("planDispatch", () => {
    it("matches idle agents to pending tasks", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        { id: "a1", name: "Agent A", soulPrompt: "Do stuff", sortOrder: 0 },
        { id: "a2", name: "Agent B", soulPrompt: "Do more", sortOrder: 1 },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          { id: "t1", title: "Task 1", priority: "P0" },
          { id: "t2", title: "Task 2", priority: "P1" },
        ],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(2);
      expect(result.dispatches[0]?.agentId).toBe("a1");
      expect(result.dispatches[0]?.taskId).toBe("t1");
      expect(result.dispatches[1]?.agentId).toBe("a2");
      expect(result.dispatches[1]?.taskId).toBe("t2");
    });

    it("respects max concurrent runs", async () => {
      db.missionRun.findMany.mockResolvedValue([{ agentId: "a1" }]);
      db.missionAgent.findMany.mockResolvedValue([
        { id: "a1", name: "Agent A", soulPrompt: "Prompt", sortOrder: 0 },
        { id: "a2", name: "Agent B", soulPrompt: "Prompt", sortOrder: 1 },
        { id: "a3", name: "Agent C", soulPrompt: "Prompt", sortOrder: 2 },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          { id: "t1", title: "Task 1", priority: "P0" },
          { id: "t2", title: "Task 2", priority: "P1" },
          { id: "t3", title: "Task 3", priority: "P2" },
        ],
        maxConcurrentRuns: 2,
      });

      expect(result.dispatches).toHaveLength(1);
    });

    it("returns empty when all agents busy", async () => {
      db.missionRun.findMany.mockResolvedValue([
        { agentId: "a1" },
        { agentId: "a2" },
      ]);
      db.missionAgent.findMany.mockResolvedValue([
        { id: "a1", name: "Agent A", soulPrompt: "Prompt", sortOrder: 0 },
        { id: "a2", name: "Agent B", soulPrompt: "Prompt", sortOrder: 1 },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [{ id: "t1", title: "Task 1", priority: "P0" }],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(0);
    });
  });

  describe("claimTask", () => {
    it("claims a task and returns true", async () => {
      db.missionTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await activities.claimTask({
        taskId: "t1",
        agentId: "a1",
      });

      expect(result.claimed).toBe(true);
    });

    it("returns false when task already claimed", async () => {
      db.missionTask.updateMany.mockResolvedValue({ count: 0 });

      const result = await activities.claimTask({
        taskId: "t1",
        agentId: "a1",
      });

      expect(result.claimed).toBe(false);
    });
  });

  describe("completeTask", () => {
    it("completes an in-progress task", async () => {
      db.missionTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await activities.completeTask({
        taskId: "t1",
        agentId: "a1",
      });

      expect(result.completed).toBe(true);
      expect(db.missionTask.updateMany).toHaveBeenCalledWith({
        where: {
          id: "t1",
          assigneeId: "a1",
          status: "IN_PROGRESS",
        },
        data: expect.objectContaining({
          status: "DONE",
        }),
      });
    });
  });

  describe("loadMissionContext", () => {
    it("loads agent, task, memory, and comments", async () => {
      db.missionAgent.findFirst.mockResolvedValue({
        id: "a1",
        soulPrompt: "You are a researcher",
      });
      db.missionTask.findUnique.mockResolvedValue({
        id: "t1",
        title: "Research topic",
        description: "Find answers",
      });
      db.missionMemory.findMany.mockResolvedValue([
        {
          key: "findings",
          value: { count: 5 },
          scope: "mission",
          agentId: "",
        },
      ]);
      db.missionComment.findMany.mockResolvedValue([
        {
          content: "Check this out",
          task: { title: "Research topic" },
        },
      ]);

      const result = await activities.loadMissionContext({
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
      });

      expect(result.context.soulPrompt).toBe("You are a researcher");
      expect(result.context.taskTitle).toBe("Research topic");
      expect(result.context.taskDescription).toBe("Find answers");
      expect(result.context.memory).toEqual({
        "mission:findings": { count: 5 },
      });
      expect(result.context.recentComments).toHaveLength(1);
    });
  });

  describe("updateBudget", () => {
    it("increments budget and detects exceeding", async () => {
      db.mission.update.mockResolvedValue({
        consumedCents: 1500,
        budgetCents: 1000,
      });

      const result = await activities.updateBudget({
        missionId: "m1",
        costCents: 100,
      });

      expect(result.exceeded).toBe(true);
      expect(result.consumedCents).toBe(1500);
      expect(result.budgetCents).toBe(1000);
    });

    it("returns not exceeded when within budget", async () => {
      db.mission.update.mockResolvedValue({
        consumedCents: 500,
        budgetCents: 1000,
      });

      const result = await activities.updateBudget({
        missionId: "m1",
        costCents: 100,
      });

      expect(result.exceeded).toBe(false);
    });

    it("handles null budget (unlimited)", async () => {
      db.mission.update.mockResolvedValue({
        consumedCents: 5000,
        budgetCents: null,
      });

      const result = await activities.updateBudget({
        missionId: "m1",
        costCents: 100,
      });

      expect(result.exceeded).toBe(false);
      expect(result.budgetCents).toBeNull();
    });
  });

  describe("readMemory / writeMemory", () => {
    it("reads memory by compound key", async () => {
      db.missionMemory.findUnique.mockResolvedValue({
        value: { data: "found" },
      });

      const result = await activities.readMemory({
        missionId: "m1",
        key: "findings",
      });

      expect(result).toEqual({ data: "found" });
      expect(db.missionMemory.findUnique).toHaveBeenCalledWith({
        where: {
          missionId_agentId_key_scope: {
            missionId: "m1",
            agentId: "",
            key: "findings",
            scope: "mission",
          },
        },
      });
    });

    it("returns null for missing memory", async () => {
      db.missionMemory.findUnique.mockResolvedValue(null);

      const result = await activities.readMemory({
        missionId: "m1",
        key: "missing",
      });

      expect(result).toBeNull();
    });

    it("upserts memory", async () => {
      db.missionMemory.upsert.mockResolvedValue({});

      await activities.writeMemory({
        missionId: "m1",
        agentId: "a1",
        key: "state",
        value: { step: 3 },
        scope: "agent",
      });

      expect(db.missionMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            missionId_agentId_key_scope: {
              missionId: "m1",
              agentId: "a1",
              key: "state",
              scope: "agent",
            },
          },
        })
      );
    });
  });

  describe("createRun", () => {
    it("creates a run and returns ID", async () => {
      db.missionRun.create.mockResolvedValue({ id: "run-1" });

      const result = await activities.createRun({
        missionId: "m1",
        taskId: "t1",
        agentId: "a1",
      });

      expect(result.runId).toBe("run-1");
    });
  });

  describe("updateRun", () => {
    it("updates run status", async () => {
      db.missionRun.update.mockResolvedValue({});

      await activities.updateRun({
        runId: "run-1",
        status: "COMPLETED",
        completedAt: 1_700_000_000_000,
        tokensUsed: 500,
        costCents: 10,
      });

      expect(db.missionRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          tokensUsed: 500,
          costCents: 10,
        }),
      });
    });
  });

  describe("getMissionStats", () => {
    it("aggregates task counts and run stats", async () => {
      db.missionTask.groupBy.mockResolvedValue([
        { status: "INBOX", _count: { id: 3 } },
        { status: "IN_PROGRESS", _count: { id: 2 } },
        { status: "DONE", _count: { id: 5 } },
      ]);
      db.missionRun.count.mockResolvedValueOnce(2).mockResolvedValueOnce(10);
      db.mission.findUnique.mockResolvedValue({
        consumedCents: 500,
        budgetCents: 2000,
      });

      const result = await activities.getMissionStats({ missionId: "m1" });

      expect(result.tasks.inbox).toBe(3);
      expect(result.tasks.inProgress).toBe(2);
      expect(result.tasks.done).toBe(5);
      expect(result.tasks.assigned).toBe(0);
      expect(result.runs.running).toBe(2);
      expect(result.runs.total).toBe(10);
      expect(result.budget.consumed).toBe(500);
      expect(result.budget.limit).toBe(2000);
    });
  });

  describe("logActivity", () => {
    it("creates an activity log entry", async () => {
      db.missionActivity.create.mockResolvedValue({});

      await activities.logActivity({
        missionId: "m1",
        type: "agent_dispatched",
        message: "Agent dispatched for task",
        agentId: "a1",
        metadata: { taskId: "t1" },
      });

      expect(db.missionActivity.create).toHaveBeenCalledWith({
        data: {
          missionId: "m1",
          type: "agent_dispatched",
          message: "Agent dispatched for task",
          agentId: "a1",
          metadata: { taskId: "t1" },
        },
      });
    });
  });

  describe("postComment", () => {
    it("creates a comment with mentions", async () => {
      db.missionComment.create.mockResolvedValue({});

      await activities.postComment({
        taskId: "t1",
        fromAgentId: "a1",
        content: "Done with analysis",
        mentions: ["a2", "a3"],
      });

      expect(db.missionComment.create).toHaveBeenCalledWith({
        data: {
          taskId: "t1",
          fromAgentId: "a1",
          content: "Done with analysis",
          mentions: ["a2", "a3"],
        },
      });
    });
  });
});
