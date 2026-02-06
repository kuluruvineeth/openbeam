import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStart = vi.fn();
const mockSignal = vi.fn();
const mockQuery = vi.fn();
const mockResult = vi.fn();
const mockGetHandle = vi.fn();
const mockScheduleCreate = vi.fn();
const mockScheduleDelete = vi.fn();
const mockScheduleGetHandle = vi.fn();

vi.mock("../client", () => ({
  getTemporalClient: vi.fn().mockResolvedValue({
    workflow: {
      start: (...args: unknown[]) => mockStart(...args),
      getHandle: (...args: unknown[]) => mockGetHandle(...args),
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

import {
  awaitMissionCompletion,
  cancelMission,
  createMissionHeartbeatSchedule,
  deleteMissionHeartbeatSchedule,
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
  });

  describe("startMission", () => {
    it("starts a mission orchestrator workflow", async () => {
      mockStart.mockResolvedValue({
        workflowId: "mission:m1",
        firstExecutionRunId: "run-1",
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
              heartbeatIntervalMin: 15,
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
