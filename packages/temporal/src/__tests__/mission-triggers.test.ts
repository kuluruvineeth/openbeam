import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStart = vi.fn();
const mockSignal = vi.fn();
const mockQuery = vi.fn();
const mockResult = vi.fn();
const mockGetHandle = vi.fn();
const mockScheduleCreate = vi.fn();
const mockScheduleDelete = vi.fn();
const mockScheduleGetHandle = vi.fn();
const mockWorkflowList = vi.fn();

vi.mock("../client", () => ({
  getTemporalClient: vi.fn().mockResolvedValue({
    workflow: {
      start: (...args: unknown[]) => mockStart(...args),
      getHandle: (...args: unknown[]) => mockGetHandle(...args),
      list: (...args: unknown[]) => mockWorkflowList(...args),
    },
    schedule: {
      create: (...args: unknown[]) => mockScheduleCreate(...args),
      getHandle: (...args: unknown[]) => mockScheduleGetHandle(...args),
    },
  }),
}));

vi.mock("../config/task-queues", () => ({
  TASK_QUEUES: { MISSION: "mission" },
}));

const LIMIT_5_REGEX = /team1 has 5 active missions \(limit: 5\)/;
const LIMIT_2_REGEX = /team1 has 2 active missions \(limit: 2\)/;

async function* toAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield await Promise.resolve(item);
  }
}

import {
  awaitMissionCompletion,
  cancelMission,
  createMissionHeartbeatSchedule,
  deleteMissionHeartbeatSchedule,
  getAgentReflection,
  getMissionHealth,
  getMissionRuntime,
  pauseMission,
  resumeMission,
  startMission,
  wakeMission,
} from "../triggers/mission";

describe("Mission Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHandle.mockReturnValue({
      signal: mockSignal,
      query: mockQuery,
      result: mockResult,
    });
    mockWorkflowList.mockReturnValue(
      (function* () {
        /* empty */
      })()
    );
  });

  describe("startMission", () => {
    it("starts a mission orchestrator workflow", async () => {
      mockStart.mockResolvedValue({
        workflowId: "mission:m1",
        firstExecutionRunId: "run-1",
        signal: mockSignal.mockResolvedValue(undefined),
      });

      const result = await startMission({
        missionId: "m1",
        teamId: "team1",
        objective: "Build the thing",
      });

      expect(result.workflowId).toBe("mission:m1");
      expect(result.runId).toBe("run-1");
      expect(mockStart).toHaveBeenCalledWith(
        "missionOrchestratorWorkflow",
        expect.objectContaining({
          taskQueue: "mission",
          workflowId: "mission:m1",
          args: [
            expect.objectContaining({
              missionId: "m1",
              teamId: "team1",
              objective: "Build the thing",
              maxConcurrentRuns: 3,
              heartbeatIntervalMin: 2,
            }),
          ],
        })
      );
    });

    it("handles already-started workflow", async () => {
      const error = new Error("Already started");
      error.name = "WorkflowExecutionAlreadyStartedError";
      Object.setPrototypeOf(error, {
        constructor: { name: "WorkflowExecutionAlreadyStartedError" },
      });

      mockStart.mockRejectedValue(error);

      await expect(
        startMission({
          missionId: "m1",
          teamId: "team1",
          objective: "Test",
        })
      ).rejects.toThrow();
    });

    it("rejects when team concurrency limit is reached", async () => {
      const activeWorkflows = Array.from({ length: 5 }, (_, i) => ({
        workflowId: `mission:m${i}`,
        runId: `run-${i}`,
        memo: { teamId: "team1" },
      }));

      mockWorkflowList.mockReturnValue(toAsyncIterable(activeWorkflows));

      await expect(
        startMission({
          missionId: "new-mission",
          teamId: "team1",
          objective: "One too many",
        })
      ).rejects.toThrow(LIMIT_5_REGEX);

      expect(mockStart).not.toHaveBeenCalled();
    });

    it("allows start when under concurrency limit", async () => {
      const activeWorkflows = [
        { workflowId: "mission:m1", runId: "run-1", memo: { teamId: "team1" } },
        { workflowId: "mission:m2", runId: "run-2", memo: { teamId: "team1" } },
      ];

      mockWorkflowList.mockReturnValue(toAsyncIterable(activeWorkflows));

      mockStart.mockResolvedValue({
        workflowId: "mission:m3",
        firstExecutionRunId: "run-3",
        signal: mockSignal.mockResolvedValue(undefined),
      });

      const result = await startMission({
        missionId: "m3",
        teamId: "team1",
        objective: "Under limit",
      });

      expect(result.workflowId).toBe("mission:m3");
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it("respects custom concurrency limit", async () => {
      const activeWorkflows = Array.from({ length: 2 }, (_, i) => ({
        workflowId: `mission:m${i}`,
        runId: `run-${i}`,
        memo: { teamId: "team1" },
      }));

      mockWorkflowList.mockReturnValue(toAsyncIterable(activeWorkflows));

      await expect(
        startMission({
          missionId: "blocked",
          teamId: "team1",
          objective: "Custom limit",
          maxConcurrentMissionsPerTeam: 2,
        })
      ).rejects.toThrow(LIMIT_2_REGEX);
    });

    it("excludes other teams from concurrency count", async () => {
      const activeWorkflows = [
        { workflowId: "mission:m1", runId: "run-1", memo: { teamId: "team2" } },
        { workflowId: "mission:m2", runId: "run-2", memo: { teamId: "team2" } },
        { workflowId: "mission:m3", runId: "run-3", memo: { teamId: "team2" } },
      ];

      mockWorkflowList.mockReturnValue(toAsyncIterable(activeWorkflows));

      mockStart.mockResolvedValue({
        workflowId: "mission:m4",
        firstExecutionRunId: "run-4",
        signal: mockSignal.mockResolvedValue(undefined),
      });

      const result = await startMission({
        missionId: "m4",
        teamId: "team1",
        objective: "Different team",
      });

      expect(result.workflowId).toBe("mission:m4");
    });
  });

  describe("wakeMission", () => {
    it("sends a wake signal to the orchestrator", async () => {
      mockSignal.mockResolvedValue(undefined);

      const result = await wakeMission("m1", {
        missionId: "m1",
        reason: "task",
      });

      expect(result).toBe(true);
      expect(mockGetHandle).toHaveBeenCalledWith("mission:m1");
    });
  });

  describe("command signals", () => {
    it("pauses a mission", async () => {
      mockSignal.mockResolvedValue(undefined);

      const result = await pauseMission("m1", "user-1");
      expect(result).toBe(true);
    });

    it("resumes a mission", async () => {
      mockSignal.mockResolvedValue(undefined);

      const result = await resumeMission("m1", "user-1");
      expect(result).toBe(true);
    });

    it("cancels a mission", async () => {
      mockSignal.mockResolvedValue(undefined);

      const result = await cancelMission("m1", "user-1");
      expect(result).toBe(true);
    });
  });

  describe("getMissionRuntime", () => {
    it("queries the orchestrator runtime state", async () => {
      mockQuery.mockResolvedValue({
        status: "idle",
        queueDepth: 3,
        runningAgents: 1,
        dispatchedRuns: 5,
        completedTasks: 2,
      });

      const result = await getMissionRuntime("m1");

      expect(result?.status).toBe("idle");
      expect(result?.queueDepth).toBe(3);
      expect(result?.runningAgents).toBe(1);
    });
  });

  describe("getMissionHealth", () => {
    it("queries mission health snapshot", async () => {
      mockQuery.mockResolvedValue({
        missionId: "m1",
        timestamp: Date.now(),
        agents: [],
        stalledTasks: [],
        failedDependencies: [],
      });

      const result = await getMissionHealth("m1");

      expect(result?.missionId).toBe("m1");
      expect(mockGetHandle).toHaveBeenCalledWith("mission:m1");
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAgentReflection", () => {
    it("queries agent reflection state from mission run workflow", async () => {
      mockQuery.mockResolvedValue({
        reflectionBuffer: [],
        replanCount: 1,
      });

      const result = await getAgentReflection({
        missionId: "m1",
        runId: "run-1",
      });

      expect(result?.replanCount).toBe(1);
      expect(mockGetHandle).toHaveBeenCalledWith("mission-run:m1:run-1");
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("awaitMissionCompletion", () => {
    it("returns the workflow result", async () => {
      mockResult.mockResolvedValue({
        missionId: "m1",
        dispatchedRuns: 10,
        completedTasks: 8,
        consumedCents: 500,
        status: "completed",
      });

      const result = await awaitMissionCompletion("m1");

      expect(result?.status).toBe("completed");
      expect(result?.dispatchedRuns).toBe(10);
    });
  });

  describe("heartbeat schedule", () => {
    it("creates a heartbeat schedule", async () => {
      mockScheduleCreate.mockResolvedValue(undefined);

      const scheduleId = await createMissionHeartbeatSchedule("m1", 15);

      expect(scheduleId).toBe("mission-heartbeat-m1");
      expect(mockScheduleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: "mission-heartbeat-m1",
          spec: expect.objectContaining({
            intervals: [{ every: "15m" }],
          }),
          action: expect.objectContaining({
            type: "startWorkflow",
            workflowType: "missionHeartbeatWorkflow",
            taskQueue: "mission",
          }),
        })
      );
    });

    it("deletes a heartbeat schedule", async () => {
      mockScheduleGetHandle.mockReturnValue({
        delete: mockScheduleDelete.mockResolvedValue(undefined),
      });

      const result = await deleteMissionHeartbeatSchedule("m1");

      expect(result).toBe(true);
      expect(mockScheduleGetHandle).toHaveBeenCalledWith(
        "mission-heartbeat-m1"
      );
    });
  });
});
