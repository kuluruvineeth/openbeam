import type { MissionHealthSnapshot } from "@openplane/types/temporal/mission-reflection";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createHealthSnapshot(
  overrides: Partial<MissionHealthSnapshot> = {}
): MissionHealthSnapshot {
  return {
    missionId: "mission-1",
    timestamp: Date.now(),
    agents: [],
    stalledTasks: [],
    failedDependencies: [],
    ...overrides,
  };
}

interface MonitorState {
  cancelled: boolean;
  intervalMs: number;
  sleepCalls: number[];
  healthChecks: Array<{ missionId: string }>;
  signalsSent: Array<{ workflowId: string; snapshot: MissionHealthSnapshot }>;
  continueAsNewCalls: unknown[];
  historyLength: number;
}

function simulateMonitorLoop(
  input: {
    missionId: string;
    parentWorkflowId: string;
    intervalMs?: number;
  },
  opts: {
    healthResults: (MissionHealthSnapshot | Error)[];
    signalResults?: (undefined | Error)[];
    cancelAfterCycle?: number;
    cancelBeforeStart?: boolean;
    historyLength?: number;
  }
): MonitorState {
  const DEFAULT_INTERVAL_MS = 30_000;
  const HISTORY_THRESHOLD = 5000;

  const state: MonitorState = {
    cancelled: opts.cancelBeforeStart ?? false,
    intervalMs: input.intervalMs ?? DEFAULT_INTERVAL_MS,
    sleepCalls: [],
    healthChecks: [],
    signalsSent: [],
    continueAsNewCalls: [],
    historyLength: opts.historyLength ?? 100,
  };

  let completedCycles = 0;

  while (!state.cancelled) {
    state.sleepCalls.push(state.intervalMs);
    if (state.cancelled) {
      break;
    }

    if (
      opts.cancelAfterCycle !== undefined &&
      completedCycles >= opts.cancelAfterCycle
    ) {
      state.cancelled = true;
      break;
    }

    const healthResult = opts.healthResults[completedCycles];
    if (!healthResult) {
      break;
    }

    try {
      if (healthResult instanceof Error) {
        throw healthResult;
      }

      state.healthChecks.push({ missionId: input.missionId });

      const signalResult = opts.signalResults?.[completedCycles];
      if (signalResult instanceof Error) {
        throw signalResult;
      }

      state.signalsSent.push({
        workflowId: input.parentWorkflowId,
        snapshot: healthResult,
      });
    } catch (_) {
      /* error swallowed intentionally; monitor continues */
    }

    completedCycles += 1;

    if (state.historyLength > HISTORY_THRESHOLD) {
      state.continueAsNewCalls.push(input);
      return state;
    }
  }

  return state;
}

describe("mission-health-monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("health check cycle", () => {
    it("calls checkMissionHealth and signals parent with snapshot", () => {
      const snapshot = createHealthSnapshot();

      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        { healthResults: [snapshot], cancelAfterCycle: 1 }
      );

      expect(state.healthChecks).toHaveLength(1);
      expect(state.healthChecks[0]).toEqual({ missionId: "mission-1" });
      expect(state.signalsSent).toHaveLength(1);
      expect(state.signalsSent[0].workflowId).toBe("orchestrator-1");
      expect(state.signalsSent[0].snapshot).toBe(snapshot);
    });

    it("uses default 30s interval when not specified", () => {
      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        { healthResults: [], cancelBeforeStart: true }
      );

      expect(state.intervalMs).toBe(30_000);
    });

    it("uses custom interval when specified", () => {
      const state = simulateMonitorLoop(
        {
          missionId: "mission-1",
          parentWorkflowId: "orchestrator-1",
          intervalMs: 15_000,
        },
        { healthResults: [], cancelBeforeStart: true }
      );

      expect(state.intervalMs).toBe(15_000);
    });
  });

  describe("error resilience", () => {
    it("continues cycling when checkMissionHealth fails", () => {
      const snapshot = createHealthSnapshot();

      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        {
          healthResults: [new Error("DB timeout"), snapshot],
          cancelAfterCycle: 2,
        }
      );

      expect(state.healthChecks).toHaveLength(1);
      expect(state.signalsSent).toHaveLength(1);
    });

    it("continues cycling when signal delivery fails", () => {
      const snapshot1 = createHealthSnapshot();
      const snapshot2 = createHealthSnapshot();

      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        {
          healthResults: [snapshot1, snapshot2],
          signalResults: [new Error("Signal delivery failed"), undefined],
          cancelAfterCycle: 2,
        }
      );

      expect(state.healthChecks).toHaveLength(2);
      expect(state.signalsSent).toHaveLength(1);
    });
  });

  describe("cancellation", () => {
    it("stops when cancel signal is received before sleep", () => {
      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        { healthResults: [createHealthSnapshot()], cancelBeforeStart: true }
      );

      expect(state.healthChecks).toHaveLength(0);
    });

    it("stops after current cycle when cancel signal received during sleep", () => {
      const snapshot = createHealthSnapshot();

      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        { healthResults: [snapshot], cancelAfterCycle: 1 }
      );

      expect(state.healthChecks).toHaveLength(1);
      expect(state.signalsSent).toHaveLength(1);
    });
  });

  describe("continueAsNew", () => {
    it("triggers continueAsNew when history exceeds threshold", () => {
      const snapshot = createHealthSnapshot();

      const inputArg = {
        missionId: "mission-1",
        parentWorkflowId: "orchestrator-1",
      };

      const state = simulateMonitorLoop(inputArg, {
        healthResults: [snapshot],
        historyLength: 6000,
      });

      expect(state.continueAsNewCalls).toHaveLength(1);
      expect(state.continueAsNewCalls[0]).toEqual(inputArg);
    });

    it("does not continueAsNew when history is below threshold", () => {
      const snapshot = createHealthSnapshot();

      const state = simulateMonitorLoop(
        { missionId: "mission-1", parentWorkflowId: "orchestrator-1" },
        { healthResults: [snapshot], historyLength: 100, cancelAfterCycle: 1 }
      );

      expect(state.continueAsNewCalls).toHaveLength(0);
    });
  });

  describe("processLatestHealthSnapshot logic", () => {
    it("skips processing when no snapshot exists", () => {
      const state = {
        missionHealthSnapshot: null as MissionHealthSnapshot | null,
        healthSnapshotProcessedAt: undefined as number | undefined,
        pendingDependencyFailures: [] as Array<{
          failedTaskId: string;
          failedTaskTitle: string;
          reason: string;
          blockedTaskIds: string[];
        }>,
      };

      const hasNewSnapshot =
        state.missionHealthSnapshot !== null &&
        state.missionHealthSnapshot.timestamp !==
          state.healthSnapshotProcessedAt;
      const hasPendingDepFailures = state.pendingDependencyFailures.length > 0;

      expect(hasNewSnapshot).toBe(false);
      expect(hasPendingDepFailures).toBe(false);
    });

    it("detects new snapshot by timestamp mismatch", () => {
      const snapshot = createHealthSnapshot({ timestamp: 1000 });
      const state = {
        missionHealthSnapshot: snapshot as MissionHealthSnapshot | null,
        healthSnapshotProcessedAt: undefined as number | undefined,
        pendingDependencyFailures: [] as Array<{
          failedTaskId: string;
          blockedTaskIds: string[];
        }>,
      };

      const hasNewSnapshot =
        state.missionHealthSnapshot !== null &&
        state.missionHealthSnapshot.timestamp !==
          state.healthSnapshotProcessedAt;

      expect(hasNewSnapshot).toBe(true);
    });

    it("skips already-processed snapshot", () => {
      const snapshot = createHealthSnapshot({ timestamp: 1000 });
      const state = {
        missionHealthSnapshot: snapshot as MissionHealthSnapshot | null,
        healthSnapshotProcessedAt: 1000,
        pendingDependencyFailures: [] as Array<{
          failedTaskId: string;
          blockedTaskIds: string[];
        }>,
      };

      const hasNewSnapshot =
        state.missionHealthSnapshot !== null &&
        state.missionHealthSnapshot.timestamp !==
          state.healthSnapshotProcessedAt;

      expect(hasNewSnapshot).toBe(false);
    });

    it("processes pending dep failures even without new snapshot", () => {
      const state = {
        missionHealthSnapshot: null as MissionHealthSnapshot | null,
        healthSnapshotProcessedAt: undefined as number | undefined,
        pendingDependencyFailures: [
          {
            failedTaskId: "task-1",
            failedTaskTitle: "Task One",
            reason: "error",
            blockedTaskIds: ["task-2"],
          },
        ],
      };

      const hasNewSnapshot =
        state.missionHealthSnapshot !== null &&
        state.missionHealthSnapshot.timestamp !==
          state.healthSnapshotProcessedAt;
      const hasPendingDepFailures = state.pendingDependencyFailures.length > 0;

      expect(hasNewSnapshot).toBe(false);
      expect(hasPendingDepFailures).toBe(true);
    });

    it("identifies stalled agents from snapshot", () => {
      const snapshot = createHealthSnapshot({
        agents: [
          {
            agentId: "agent-1",
            taskId: "task-1",
            stepsCompleted: 5,
            lastProgressScore: 0.2,
            stuckSince: Date.now() - 60_000,
            replanCount: 2,
            status: "stuck",
          },
          {
            agentId: "agent-2",
            taskId: "task-2",
            stepsCompleted: 10,
            lastProgressScore: 0.8,
            stuckSince: null,
            replanCount: 0,
            status: "progressing",
          },
        ],
      });

      const stalledAgents = snapshot.agents.filter((a) => a.status === "stuck");
      expect(stalledAgents).toHaveLength(1);
      expect(stalledAgents[0].agentId).toBe("agent-1");
    });

    it("merges snapshot dep failures with pending dep failures", () => {
      const snapshotDeps = [
        { failedTaskId: "task-A", blockedTaskIds: ["task-B"] },
      ];
      const pendingDeps = [
        {
          failedTaskId: "task-C",
          failedTaskTitle: "Task C",
          reason: "timeout",
          blockedTaskIds: ["task-D"],
        },
      ];

      const merged = [
        ...snapshotDeps.map((dep) => ({
          failedTaskId: dep.failedTaskId,
          failedTaskTitle: dep.failedTaskId,
          reason: "Upstream task is blocked or failed",
        })),
        ...pendingDeps.map((dep) => ({
          failedTaskId: dep.failedTaskId,
          failedTaskTitle: dep.failedTaskTitle,
          reason: dep.reason,
        })),
      ];

      expect(merged).toHaveLength(2);
      expect(merged[0].failedTaskId).toBe("task-A");
      expect(merged[1].failedTaskId).toBe("task-C");
      expect(merged[1].reason).toBe("timeout");
    });
  });
});
