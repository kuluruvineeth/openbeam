import { beforeEach, describe, expect, it, vi } from "vitest";

import { createControlLifecycleActivities } from "../activities/agents/control-lifecycle";

vi.mock("@openbeam/db", () => ({
  findControlAgentById: vi.fn(),
}));

vi.mock("@openbeam/services/control/heartbeat", () => ({
  claimAndStartRun: vi.fn(),
  completeRunWithResult: vi.fn(),
  failRunWithError: vi.fn(),
  ensureRuntimeState: vi.fn(),
  updateRuntimeSession: vi.fn(),
  reapOrphanedRuns: vi.fn(),
  enqueueWakeup: vi.fn(),
}));

const mockFindMany = vi.fn().mockResolvedValue([]);

function createMockDb() {
  return {
    controlAgentWakeupRequest: {
      findMany: mockFindMany,
    },
  } as never;
}

function mockAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-1",
    teamId: "team-1",
    name: "test-agent",
    adapterType: "claude-code",
    adapterConfig: { model: "opus" },
    runtimeConfig: { heartbeatEnabled: true, heartbeatIntervalSec: 300 },
    status: "IDLE",
    budgetMonthlyCents: 10_000,
    spentMonthlyCents: 500,
    ...overrides,
  };
}

describe("control-lifecycle activities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadAgentForRun", () => {
    it("returns agent config fields", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      vi.mocked(findControlAgentById).mockResolvedValue(mockAgent() as never);

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.loadAgentForRun({
        teamId: "team-1",
        agentId: "agent-1",
      });

      expect(result).toMatchObject({
        id: "agent-1",
        teamId: "team-1",
        name: "test-agent",
        adapterType: "claude-code",
        status: "IDLE",
        budgetMonthlyCents: 10_000,
      });
    });

    it("throws nonRetryable on missing agent", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      vi.mocked(findControlAgentById).mockResolvedValue(null as never);

      const activities = createControlLifecycleActivities({ db });

      await expect(
        activities.loadAgentForRun({ teamId: "team-1", agentId: "missing" })
      ).rejects.toThrow("not found");
    });

    it("throws nonRetryable on terminated agent", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      vi.mocked(findControlAgentById).mockResolvedValue(
        mockAgent({ status: "TERMINATED" }) as never
      );

      const activities = createControlLifecycleActivities({ db });

      await expect(
        activities.loadAgentForRun({ teamId: "team-1", agentId: "agent-1" })
      ).rejects.toThrow("terminated");
    });
  });

  describe("claimAndStartRun", () => {
    it("delegates to service and returns sessionIdBefore", async () => {
      const db = createMockDb();
      const { claimAndStartRun } = await import(
        "@openbeam/services/control/heartbeat"
      );
      vi.mocked(claimAndStartRun).mockResolvedValue({
        sessionIdBefore: "session-prev",
      } as never);

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.claimAndStartRun({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
      });

      expect(result.sessionIdBefore).toBe("session-prev");
      expect(claimAndStartRun).toHaveBeenCalledWith(db, {
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
      });
    });
  });

  describe("completeRun", () => {
    it("calls completeRunWithResult with correct params", async () => {
      const db = createMockDb();
      const { completeRunWithResult } = await import(
        "@openbeam/services/control/heartbeat"
      );
      vi.mocked(completeRunWithResult).mockResolvedValue(undefined as never);

      const activities = createControlLifecycleActivities({ db });
      const fakeResult = {
        exitCode: 0,
        signal: null,
        timedOut: false,
      };

      await activities.completeRun({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
        result: fakeResult as never,
      });

      expect(completeRunWithResult).toHaveBeenCalledWith(db, {
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
        result: fakeResult,
      });
    });
  });

  describe("failRun", () => {
    it("calls failRunWithError", async () => {
      const db = createMockDb();
      const { failRunWithError } = await import(
        "@openbeam/services/control/heartbeat"
      );
      vi.mocked(failRunWithError).mockResolvedValue(undefined as never);

      const activities = createControlLifecycleActivities({ db });
      await activities.failRun({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
        error: "something broke",
        errorCode: "test_error",
      });

      expect(failRunWithError).toHaveBeenCalledWith(db, {
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        wakeupRequestId: "req-1",
        error: "something broke",
        errorCode: "test_error",
      });
    });
  });

  describe("reapOrphanedRuns", () => {
    it("returns checked and reaped counts", async () => {
      const db = createMockDb();
      const { reapOrphanedRuns } = await import(
        "@openbeam/services/control/heartbeat"
      );
      vi.mocked(reapOrphanedRuns).mockResolvedValue({
        checked: 5,
        reaped: 2,
      } as never);

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.reapOrphanedRuns({
        teamId: "team-1",
        staleThresholdMs: 300_000,
      });

      expect(result).toEqual({ checked: 5, reaped: 2 });
    });
  });

  describe("loadPendingWakeupRequests", () => {
    it("returns queued requests with agent config", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      mockFindMany.mockResolvedValue([
        {
          id: "req-1",
          agentId: "agent-1",
          payload: { key: "value" },
          reason: "test",
          source: "ON_DEMAND",
        },
      ] as never);
      vi.mocked(findControlAgentById).mockResolvedValue(mockAgent() as never);

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.loadPendingWakeupRequests({
        teamId: "team-1",
      });

      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]?.adapterType).toBe("claude-code");
    });
  });

  describe("loadAgentTimerConfig", () => {
    it("parses runtimeConfig correctly", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      vi.mocked(findControlAgentById).mockResolvedValue(
        mockAgent({
          runtimeConfig: {
            heartbeatEnabled: true,
            heartbeatIntervalSec: 300,
          },
        }) as never
      );

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.loadAgentTimerConfig({
        teamId: "team-1",
        agentId: "agent-1",
      });

      expect(result.enabled).toBe(true);
      expect(result.intervalSec).toBe(300);
    });

    it("returns disabled when interval is zero", async () => {
      const db = createMockDb();
      const { findControlAgentById } = await import("@openbeam/db");
      vi.mocked(findControlAgentById).mockResolvedValue(
        mockAgent({
          runtimeConfig: { heartbeatEnabled: true, heartbeatIntervalSec: 0 },
        }) as never
      );

      const activities = createControlLifecycleActivities({ db });
      const result = await activities.loadAgentTimerConfig({
        teamId: "team-1",
        agentId: "agent-1",
      });

      expect(result.enabled).toBe(false);
    });
  });
});
