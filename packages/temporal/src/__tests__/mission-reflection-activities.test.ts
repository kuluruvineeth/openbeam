import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReflectionActivities } from "../activities/mission/reflection";

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
    }),
  },
}));

function createMockDb() {
  return {
    missionRun: {
      findMany: vi.fn(),
    },
    missionMemory: {
      findUnique: vi.fn(),
    },
    missionTask: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    missionComment: {
      create: vi.fn(),
    },
  };
}

describe("createReflectionActivities", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("parses evaluateProgress JSON response", async () => {
    const generateText = vi.fn().mockResolvedValue(`{
      "progressScore": 0.25,
      "confidenceScore": 0.4,
      "stuckIndicators": {
        "repeatingActions": true,
        "noNewArtifacts": true,
        "errorLoop": false,
        "progressPlateau": true
      },
      "reasoning": "Not enough new evidence",
      "suggestedAction": "replan"
    }`);

    const activities = createReflectionActivities({
      db: db as never,
      generateText,
    });

    const result = await activities.evaluateProgress({
      missionId: "mission-1",
      taskId: "task-1",
      agentId: "agent-1",
      currentStep: 4,
      maxSteps: 10,
      recentArtifacts: [
        {
          id: "a1",
          type: "text",
          content: "partial output",
          createdAt: Date.now(),
        },
      ],
      reflectionBuffer: [],
      taskContext: {
        title: "Investigate regression",
        description: "Find root cause",
      },
    });

    expect(result.progressScore).toBe(0.25);
    expect(result.suggestedAction).toBe("replan");
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("falls back to heuristic when evaluation response is invalid", async () => {
    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn().mockResolvedValue("not json"),
    });

    const result = await activities.evaluateProgress({
      missionId: "mission-1",
      taskId: "task-1",
      agentId: "agent-1",
      currentStep: 9,
      maxSteps: 10,
      recentArtifacts: [],
      reflectionBuffer: [],
      taskContext: {
        title: "Investigate regression",
        description: null,
      },
    });

    expect(result.suggestedAction).toBe("replan");
    expect(result.progressScore).toBe(0.2);
  });

  it("builds mission health snapshot from run/memory/task state", async () => {
    db.missionRun.findMany.mockResolvedValue([
      {
        agentId: "agent-1",
        taskId: "task-1",
        startedAt: new Date(Date.now() - 11 * 60 * 1000),
      },
    ]);

    db.missionMemory.findUnique.mockImplementation((args) => {
      const key = args.where.missionId_agentId_key_scope.key;
      if (key === "reflection_buffer") {
        return {
          value: [
            {
              step: 4,
              evaluation: {
                progressScore: 0.1,
                suggestedAction: "continue",
              },
            },
          ],
        };
      }

      return {
        value: {
          replanCount: 2,
        },
      };
    });

    db.missionTask.findMany
      .mockResolvedValueOnce([
        {
          id: "task-failed",
          dependsOn: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "task-2",
          dependsOn: ["task-failed"],
        },
      ]);

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.checkMissionHealth({
      missionId: "mission-1",
    });

    expect(result.agents[0]?.status).toBe("stuck");
    expect(result.stalledTasks).toEqual(["task-1"]);
    expect(result.failedDependencies[0]).toEqual({
      failedTaskId: "task-failed",
      blockedTaskIds: ["task-2"],
    });
  });

  it("bounds running runs query with take limit", async () => {
    db.missionRun.findMany.mockResolvedValue([]);
    db.missionTask.findMany.mockResolvedValue([]);

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    await activities.checkMissionHealth({ missionId: "mission-1" });

    expect(db.missionRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        orderBy: { startedAt: "asc" },
      })
    );
  });

  it("uses only recent reflection steps for health assessment", async () => {
    const manyReflections = Array.from({ length: 30 }, (_, i) => ({
      step: i + 1,
      evaluation: {
        progressScore: i < 25 ? 0.9 : 0.1,
        suggestedAction: "continue" as const,
      },
    }));

    db.missionRun.findMany.mockResolvedValue([
      {
        agentId: "agent-1",
        taskId: "task-1",
        startedAt: new Date(Date.now() - 11 * 60 * 1000),
      },
    ]);

    db.missionMemory.findUnique.mockImplementation((args) => {
      const key = args.where.missionId_agentId_key_scope.key;
      if (key === "reflection_buffer") {
        return { value: manyReflections };
      }
      return { value: { replanCount: 0 } };
    });

    db.missionTask.findMany.mockResolvedValue([]);

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.checkMissionHealth({
      missionId: "mission-1",
    });

    expect(result.agents[0]?.lastProgressScore).toBe(0.1);
    expect(result.agents[0]?.stepsCompleted).toBe(30);
  });

  it("notifies and adapts dependent tasks after dependency failure", async () => {
    db.missionTask.findMany.mockResolvedValue([
      {
        id: "task-2",
        assigneeId: "agent-2",
        dependsOn: ["task-failed"],
      },
    ]);
    db.missionComment.create.mockResolvedValue(undefined);
    db.missionTask.update.mockResolvedValue(undefined);

    const activities = createReflectionActivities({
      db: db as never,
      generateText: vi.fn(),
    });

    const result = await activities.notifyDependencyFailure({
      missionId: "mission-1",
      failedTaskId: "task-failed",
      failedTaskTitle: "Upstream Task",
      reason: "Blocked",
    });

    expect(result.notifiedTaskIds).toEqual(["task-2"]);
    expect(result.adaptedTaskIds).toEqual(["task-2"]);
    expect(db.missionComment.create).toHaveBeenCalledTimes(1);
    expect(db.missionTask.update).toHaveBeenCalledWith({
      where: { id: "task-2" },
      data: { dependsOn: [] },
    });
  });
});
