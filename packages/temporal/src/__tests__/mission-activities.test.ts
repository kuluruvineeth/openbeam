import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMissionActivities,
  createMissionTimelinePublisher,
} from "../activities/mission";
import type { MissionActivities } from "../activities/mission/types";

const REQUEST_ID_PATTERN = /^agent-agent-xyz-\d+$/;

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

describe("Mission Activities", () => {
  let db: ReturnType<typeof createMockDb>;
  let activities: MissionActivities;
  let publishTimelineEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = createMockDb();
    publishTimelineEvent = vi.fn().mockResolvedValue(undefined);
    activities = createMissionActivities({
      db: db as never,
      publishTimelineEvent,
    });
  });

  describe("refreshQueue", () => {
    it("returns pending tasks ordered by priority", async () => {
      db.missionTask.findMany.mockResolvedValue([
        {
          id: "t1",
          title: "Fix bug",
          priority: "P0",
          assigneeId: null,
          dependsOn: [],
          requiredCapabilities: [],
        },
        {
          id: "t2",
          title: "Add feature",
          priority: "P2",
          assigneeId: null,
          dependsOn: [],
          requiredCapabilities: [],
        },
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

    it("filters out tasks with unmet dependencies", async () => {
      db.missionTask.findMany
        .mockResolvedValueOnce([
          {
            id: "t1",
            title: "Research",
            priority: "P0",
            assigneeId: null,
            dependsOn: [],
            requiredCapabilities: [],
          },
          {
            id: "t2",
            title: "Synthesize",
            priority: "P1",
            assigneeId: null,
            dependsOn: ["t1"],
            requiredCapabilities: [],
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.id).toBe("t1");
    });

    it("includes tasks with all dependencies satisfied", async () => {
      db.missionTask.findMany
        .mockResolvedValueOnce([
          {
            id: "t1",
            title: "Research",
            priority: "P0",
            assigneeId: null,
            dependsOn: [],
            requiredCapabilities: [],
          },
          {
            id: "t2",
            title: "Synthesize",
            priority: "P1",
            assigneeId: null,
            dependsOn: ["t3"],
            requiredCapabilities: [],
          },
        ])
        .mockResolvedValueOnce([{ id: "t3" }]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
    });

    it("skips dependency check when no tasks have dependencies", async () => {
      db.missionTask.findMany.mockResolvedValue([
        {
          id: "t1",
          title: "Task A",
          priority: "P0",
          assigneeId: null,
          dependsOn: [],
          requiredCapabilities: [],
        },
        {
          id: "t2",
          title: "Task B",
          priority: "P1",
          assigneeId: null,
          dependsOn: [],
          requiredCapabilities: [],
        },
      ]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(2);
      expect(db.missionTask.findMany).toHaveBeenCalledTimes(1);
    });

    it("handles tasks with multiple dependencies partially met", async () => {
      db.missionTask.findMany
        .mockResolvedValueOnce([
          {
            id: "t3",
            title: "Final",
            priority: "P2",
            assigneeId: null,
            dependsOn: ["t1", "t2"],
            requiredCapabilities: [],
          },
        ])
        .mockResolvedValueOnce([{ id: "t1" }]);

      const result = await activities.refreshQueue({ missionId: "m1" });

      expect(result.tasks).toHaveLength(0);
    });
  });

  describe("planDispatch", () => {
    it("matches idle agents to same-priority tasks", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "Do stuff",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
        {
          id: "a2",
          name: "Agent B",
          soulPrompt: "Do more",
          sortOrder: 1,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          { id: "t1", title: "Task 1", priority: "P0" },
          { id: "t2", title: "Task 2", priority: "P0" },
        ],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(2);
      expect(result.dispatches[0]?.agentId).toBe("a1");
      expect(result.dispatches[0]?.taskId).toBe("t1");
      expect(result.dispatches[1]?.agentId).toBe("a2");
      expect(result.dispatches[1]?.taskId).toBe("t2");
    });

    it("includes tools in dispatch output", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Researcher",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: [],
          tools: ["search_hybrid", "rag_answer"],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [{ id: "t1", title: "Research", priority: "P0" }],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches[0]?.tools).toEqual([
        "search_hybrid",
        "rag_answer",
      ]);
    });

    it("only dispatches highest priority tier", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Specialist A",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
        {
          id: "a2",
          name: "Specialist B",
          soulPrompt: "P",
          sortOrder: 1,
          capabilities: [],
          tools: [],
        },
        {
          id: "a3",
          name: "Coordinator",
          soulPrompt: "P",
          sortOrder: 2,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          { id: "t1", title: "Research A", priority: "P0" },
          { id: "t2", title: "Research B", priority: "P0" },
          { id: "t3", title: "Synthesize", priority: "P1" },
        ],
        maxConcurrentRuns: 5,
      });

      expect(result.dispatches).toHaveLength(2);
      expect(result.dispatches.map((d) => d.taskId)).toEqual(["t1", "t2"]);
    });

    it("dispatches lower priority when higher priority done", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Coordinator",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [{ id: "t3", title: "Synthesize", priority: "P1" }],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(1);
      expect(result.dispatches[0]?.taskId).toBe("t3");
    });

    it("respects max concurrent runs", async () => {
      db.missionRun.findMany.mockResolvedValue([{ agentId: "a1" }]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "Prompt",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
        {
          id: "a2",
          name: "Agent B",
          soulPrompt: "Prompt",
          sortOrder: 1,
          capabilities: [],
          tools: [],
        },
        {
          id: "a3",
          name: "Agent C",
          soulPrompt: "Prompt",
          sortOrder: 2,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          { id: "t1", title: "Task 1", priority: "P0" },
          { id: "t2", title: "Task 2", priority: "P0" },
          { id: "t3", title: "Task 3", priority: "P0" },
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
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "Prompt",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
        {
          id: "a2",
          name: "Agent B",
          soulPrompt: "Prompt",
          sortOrder: 1,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [{ id: "t1", title: "Task 1", priority: "P0" }],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(0);
    });

    it("handles empty pending tasks", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(0);
    });

    it("matches agent capabilities to task requirements", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Writer",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: ["writing", "synthesis"],
          tools: [],
        },
        {
          id: "a2",
          name: "Researcher",
          soulPrompt: "P",
          sortOrder: 1,
          capabilities: ["research", "analysis"],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          {
            id: "t1",
            title: "Analyze data",
            priority: "P0",
            requiredCapabilities: ["research", "analysis"],
          },
        ],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(1);
      expect(result.dispatches[0]?.agentId).toBe("a2");
    });

    it("falls back to sortOrder when no capabilities defined", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: [],
          tools: [],
        },
        {
          id: "a2",
          name: "Agent B",
          soulPrompt: "P",
          sortOrder: 1,
          capabilities: [],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [{ id: "t1", title: "Generic task", priority: "P0" }],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches[0]?.agentId).toBe("a1");
    });

    it("prefers agent with higher capability overlap", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Generalist",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: ["research"],
          tools: [],
        },
        {
          id: "a2",
          name: "Specialist",
          soulPrompt: "P",
          sortOrder: 1,
          capabilities: ["research", "analysis", "data"],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          {
            id: "t1",
            title: "Data analysis",
            priority: "P0",
            requiredCapabilities: ["research", "analysis", "data"],
          },
        ],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches[0]?.agentId).toBe("a2");
    });

    it("honors explicitly assigned tasks when assigned agent is idle", async () => {
      db.missionRun.findMany.mockResolvedValue([]);
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Agent A",
          soulPrompt: "P",
          sortOrder: 0,
          capabilities: ["research"],
          tools: [],
        },
        {
          id: "a2",
          name: "Agent B",
          soulPrompt: "P",
          sortOrder: 1,
          capabilities: ["research"],
          tools: [],
        },
      ]);

      const result = await activities.planDispatch({
        missionId: "m1",
        pendingTasks: [
          {
            id: "t1",
            title: "Assigned task",
            priority: "P0",
            assigneeId: "a2",
            requiredCapabilities: ["research"],
          },
        ],
        maxConcurrentRuns: 3,
      });

      expect(result.dispatches).toHaveLength(1);
      expect(result.dispatches[0]?.agentId).toBe("a2");
      expect(result.dispatches[0]?.taskId).toBe("t1");
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
      db.mission.findUnique.mockResolvedValue({ teamId: "team1" });
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
      expect(publishTimelineEvent).toHaveBeenCalledWith({
        missionId: "m1",
        eventType: "cost.updated",
        payload: {
          consumedCents: 1500,
          budgetCents: 1000,
          costCents: 100,
        },
      });
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
      db.missionActivity.create.mockResolvedValue({
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

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
      expect(publishTimelineEvent).toHaveBeenCalledWith({
        missionId: "m1",
        eventType: "agent_dispatched",
        payload: {
          taskId: "t1",
          agentId: "a1",
          summary: "Agent dispatched for task",
        },
        timestamp: new Date("2026-01-01T00:00:00.000Z").getTime(),
      });
    });

    it("forwards metadata payload for timeline stream", async () => {
      db.missionActivity.create.mockResolvedValue({
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      });

      await activities.logActivity({
        missionId: "m1",
        type: "approval_resolved",
        message: "Approved",
        metadata: {
          approvalId: "approval-1",
          approved: true,
        },
      });

      expect(publishTimelineEvent).toHaveBeenCalledWith({
        missionId: "m1",
        eventType: "approval_resolved",
        payload: {
          approvalId: "approval-1",
          approved: true,
          summary: "Approved",
        },
        timestamp: new Date("2026-01-01T00:00:01.000Z").getTime(),
      });
    });
  });

  describe("finalizeMission", () => {
    it("publishes mission.completed when finalizing completed state", async () => {
      db.mission.update.mockResolvedValue({});

      await activities.finalizeMission({
        missionId: "m1",
        status: "COMPLETED",
      });

      expect(db.mission.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { status: "COMPLETED" },
      });
      expect(publishTimelineEvent).toHaveBeenCalledWith({
        missionId: "m1",
        eventType: "mission.completed",
        payload: { status: "COMPLETED" },
      });
    });

    it("publishes mission.cancelled when finalizing cancelled state", async () => {
      db.mission.update.mockResolvedValue({});

      await activities.finalizeMission({
        missionId: "m1",
        status: "CANCELLED",
      });

      expect(publishTimelineEvent).toHaveBeenCalledWith({
        missionId: "m1",
        eventType: "mission.cancelled",
        payload: { status: "CANCELLED" },
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

  describe("createMissionTask", () => {
    it("creates a task and returns taskId", async () => {
      db.missionTask.create.mockResolvedValue({ id: "new-task-1" });

      const result = await activities.createMissionTask({
        missionId: "m1",
        agentId: "a1",
        title: "Sub-investigation",
        description: "Research subtopic X",
        priority: "P1",
      });

      expect(result.taskId).toBe("new-task-1");
      expect(db.missionTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          missionId: "m1",
          title: "Sub-investigation",
          description: "Research subtopic X",
          priority: "P1",
          dependsOn: [],
          requiredCapabilities: [],
          createdById: "a1",
        }),
      });
    });

    it("stores dependsOn and requiredCapabilities", async () => {
      db.missionTask.create.mockResolvedValue({ id: "new-task-2" });

      await activities.createMissionTask({
        missionId: "m1",
        agentId: "a1",
        title: "Analysis",
        dependsOn: ["t1", "t2"],
        requiredCapabilities: ["analysis", "data"],
      });

      expect(db.missionTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dependsOn: ["t1", "t2"],
          requiredCapabilities: ["analysis", "data"],
        }),
      });
    });

    it("defaults priority to P2", async () => {
      db.missionTask.create.mockResolvedValue({ id: "new-task-3" });

      await activities.createMissionTask({
        missionId: "m1",
        agentId: "a1",
        title: "Default priority task",
      });

      expect(db.missionTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: "P2",
        }),
      });
    });

    it("generates requestId with agent prefix", async () => {
      db.missionTask.create.mockResolvedValue({ id: "new-task-4" });

      await activities.createMissionTask({
        missionId: "m1",
        agentId: "agent-xyz",
        title: "Task",
      });

      const createCall = db.missionTask.create.mock.calls[0]?.[0];
      expect(createCall?.data?.requestId).toMatch(REQUEST_ID_PATTERN);
    });
  });

  describe("sendFeedback", () => {
    it("posts comment with feedback", async () => {
      db.missionComment.create.mockResolvedValue({});

      await activities.sendFeedback({
        taskId: "t1",
        fromAgentId: "a1",
        feedback: "Needs more detail on section 2",
        reopen: false,
      });

      expect(db.missionComment.create).toHaveBeenCalledWith({
        data: {
          taskId: "t1",
          fromAgentId: "a1",
          content: "Needs more detail on section 2",
          mentions: [],
        },
      });
      expect(db.missionTask.update).not.toHaveBeenCalled();
    });

    it("reopens task to INBOX when reopen is true", async () => {
      db.missionComment.create.mockResolvedValue({});
      db.missionTask.update.mockResolvedValue({});

      await activities.sendFeedback({
        taskId: "t1",
        fromAgentId: "a1",
        feedback: "Incomplete research, please redo",
        reopen: true,
      });

      expect(db.missionTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "INBOX", assigneeId: null, completedAt: null },
      });
    });

    it("mentions targetAgentId when provided", async () => {
      db.missionComment.create.mockResolvedValue({});

      await activities.sendFeedback({
        taskId: "t1",
        fromAgentId: "a1",
        feedback: "Revise your analysis",
        targetAgentId: "a2",
        reopen: false,
      });

      expect(db.missionComment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mentions: ["a2"],
        }),
      });
    });
  });

  describe("spawn lifecycle activities", () => {
    it("lists mission agents for capability queries", async () => {
      db.missionAgent.findMany.mockResolvedValue([
        {
          id: "a1",
          name: "Research Specialist",
          role: "Research",
          level: "specialist",
          capabilities: ["research"],
          tools: ["search_hybrid"],
        },
      ]);

      const result = await activities.getMissionAgents({ missionId: "m1" });

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0]?.id).toBe("a1");
      expect(db.missionAgent.findMany).toHaveBeenCalledWith({
        where: { missionId: "m1" },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          level: true,
          capabilities: true,
          tools: true,
        },
      });
    });

    it("approves valid spawn requests with adjusted budget", async () => {
      db.missionAgent.findFirst
        .mockResolvedValueOnce({
          id: "a1",
          level: "specialist",
        })
        .mockResolvedValueOnce(null);
      db.missionActivity.findMany.mockResolvedValue([]);
      db.missionRun.count.mockResolvedValue(0);

      const result = await activities.validateSpawnRequest({
        missionId: "m1",
        requestId: "spawn-1",
        request: {
          requestingAgentId: "a1",
          taskDescription:
            "Collect external citations and summarize root cause",
          requiredCapabilities: ["research"],
          maxSteps: 12,
          budgetCentsLimit: 60,
          priority: "P1",
        },
        currentSpawnedAgentCount: 1,
        spawnLimits: {
          maxSpawnedAgentsPerMission: 10,
          maxSpawnedAgentsPerAgent: 3,
          maxSpawnDepth: 2,
          maxConcurrentSpawned: 5,
          spawnBudgetPercentage: 30,
        },
        consumedCents: 100,
        budgetCents: 500,
      });

      expect(result.approved).toBe(true);
      expect(result.adjustedBudgetCents).toBe(60);
      expect(result.adjustedMaxSteps).toBe(12);
    });

    it("denies spawn when mission limit is reached", async () => {
      const result = await activities.validateSpawnRequest({
        missionId: "m1",
        requestId: "spawn-2",
        request: {
          requestingAgentId: "a1",
          taskDescription: "Analyze data quality anomalies for the new dataset",
          requiredCapabilities: ["analysis"],
          maxSteps: 10,
          budgetCentsLimit: 50,
          priority: "P2",
        },
        currentSpawnedAgentCount: 10,
        spawnLimits: {
          maxSpawnedAgentsPerMission: 10,
          maxSpawnedAgentsPerAgent: 3,
          maxSpawnDepth: 2,
          maxConcurrentSpawned: 5,
          spawnBudgetPercentage: 30,
        },
        consumedCents: 0,
        budgetCents: 1000,
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain("Mission spawn limit reached");
    });

    it("generates blueprint with normalized capabilities and tools", async () => {
      const result = await activities.generateSpawnedSoulPrompt({
        missionId: "m1",
        requestId: "spawn-3",
        request: {
          requestingAgentId: "a1",
          taskDescription: "Prepare a structured writeup of findings",
          requiredCapabilities: ["Writing", "Research"],
          maxSteps: 9,
          budgetCentsLimit: 40,
          priority: "P2",
        },
      });

      expect(result.blueprint.name).toContain("Writing");
      expect(result.blueprint.capabilities).toEqual(["writing", "research"]);
      expect(result.blueprint.tools).toContain("mission_query_capabilities");
    });

    it("creates spawned mission agent and assigned task", async () => {
      db.mission.findUnique.mockResolvedValue({
        id: "m1",
        teamId: "team-1",
        createdById: "user-1",
      });
      db.missionAgent.aggregate.mockResolvedValue({
        _max: { sortOrder: 2 },
      });
      db.backgroundAgent.create.mockResolvedValue({ id: "bg-1" });
      db.missionAgent.create.mockResolvedValue({ id: "mission-agent-1" });
      db.missionTask.create.mockResolvedValue({ id: "task-1" });

      const result = await activities.createSpawnedAgent({
        missionId: "m1",
        requestId: "spawn-4",
        request: {
          requestingAgentId: "a1",
          taskDescription:
            "Investigate source discrepancies and report root cause",
          requiredCapabilities: ["research"],
          maxSteps: 8,
          budgetCentsLimit: 35,
          priority: "P1",
          dependsOnTaskId: "task-root",
        },
        blueprint: {
          name: "Research Specialist",
          role: "Specialist for research",
          soulPrompt: "prompt",
          tools: ["search_hybrid", "mission_send_message"],
          capabilities: ["research"],
          maxSteps: 8,
          budgetCentsLimit: 35,
          parentAgentId: "a1",
          spawnReason: "Investigate source discrepancies and report root cause",
        },
      });

      expect(result).toEqual({
        missionAgentId: "mission-agent-1",
        taskId: "task-1",
      });
      expect(db.missionTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          missionId: "m1",
          status: "ASSIGNED",
          assigneeId: "mission-agent-1",
          requestId: "spawn-4",
          dependsOn: ["task-root"],
        }),
        select: { id: true },
      });
    });
  });
});

describe("createMissionTimelinePublisher", () => {
  it("publishes normalized timeline events using resolved run id", async () => {
    const db = createMockDb();
    db.mission.findUnique.mockResolvedValue({ runId: "run-1" });
    const publish = vi.fn().mockResolvedValue(undefined);
    const publisher = createMissionTimelinePublisher(db as never, publish);

    await publisher({
      missionId: "m1",
      eventType: "approval_resolved",
      payload: { approvalId: "appr-1" },
      timestamp: 1_700_000_000_000,
    });

    expect(db.mission.findUnique).toHaveBeenCalledWith({
      where: { id: "m1" },
      select: { runId: true },
    });
    expect(publish).toHaveBeenCalledWith({
      missionId: "m1",
      runId: "run-1",
      lane: "autonomous",
      eventType: "approval.resolved",
      payload: { approvalId: "appr-1" },
      timestamp: 1_700_000_000_000,
    });
  });

  it("reuses cached run id for subsequent events", async () => {
    const db = createMockDb();
    db.mission.findUnique.mockResolvedValue({ runId: "run-1" });
    const publish = vi.fn().mockResolvedValue(undefined);
    const publisher = createMissionTimelinePublisher(db as never, publish);

    await publisher({
      missionId: "m1",
      eventType: "agent_run_started",
      payload: { agentId: "a1" },
    });
    await publisher({
      missionId: "m1",
      eventType: "agent_run_completed",
      payload: { agentId: "a1" },
    });

    expect(db.mission.findUnique).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("does not publish when mission run id is missing", async () => {
    const db = createMockDb();
    db.mission.findUnique.mockResolvedValue({ runId: null });
    const publish = vi.fn().mockResolvedValue(undefined);
    const publisher = createMissionTimelinePublisher(db as never, publish);

    await publisher({
      missionId: "m1",
      eventType: "agent_run_started",
      payload: { agentId: "a1" },
    });

    expect(publish).not.toHaveBeenCalled();
  });
});
