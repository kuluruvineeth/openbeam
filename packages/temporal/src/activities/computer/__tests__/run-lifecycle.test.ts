import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateComputerRun = vi.fn();
const mockClaimComputerRun = vi.fn();
const mockFailStaleRunningRuns = vi.fn();
const mockRejectComputerRun = vi.fn();
const mockUpdateComputerRun = vi.fn();

vi.mock("@openbeam/db", () => ({
  createComputerRun: (...args: unknown[]) => mockCreateComputerRun(...args),
  claimComputerRun: (...args: unknown[]) => mockClaimComputerRun(...args),
  failStaleRunningRuns: (...args: unknown[]) =>
    mockFailStaleRunningRuns(...args),
  rejectComputerRun: (...args: unknown[]) => mockRejectComputerRun(...args),
  updateComputerRun: (...args: unknown[]) => mockUpdateComputerRun(...args),
}));

import { createRunLifecycleActivities } from "../run-lifecycle";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("run-lifecycle activities", () => {
  const db = {} as never;

  beforeEach(() => {
    mockCreateComputerRun.mockReset().mockResolvedValue(undefined);
    mockClaimComputerRun.mockReset().mockResolvedValue({ id: "run_1" });
    mockFailStaleRunningRuns.mockReset().mockResolvedValue(0);
    mockRejectComputerRun.mockReset().mockResolvedValue(true);
    mockUpdateComputerRun.mockReset().mockResolvedValue(undefined);
  });

  describe("createAndClaimRun", () => {
    it("creates a run with a UUID and returns the runId", async () => {
      const activities = createRunLifecycleActivities(db);

      const runId = await activities.createAndClaimRun({
        agentId: "agent_1",
        teamId: "team_a",
        triggeredBy: "MANUAL",
        triggeredByUser: "user_1",
      });

      expect(runId).toMatch(UUID_PATTERN);
      expect(mockCreateComputerRun).toHaveBeenCalledWith(db, {
        id: runId,
        agentId: "agent_1",
        teamId: "team_a",
        triggeredBy: "MANUAL",
        triggeredByUser: "user_1",
      });
    });
  });

  describe("claimRun", () => {
    it("returns true when claim succeeds", async () => {
      mockClaimComputerRun.mockResolvedValueOnce({ id: "run_1" });
      const activities = createRunLifecycleActivities(db);

      const claimed = await activities.claimRun({
        runId: "run_1",
        agentId: "agent_1",
      });

      expect(claimed).toBe(true);
    });

    it("returns false when claim fails (concurrent run)", async () => {
      mockClaimComputerRun.mockResolvedValueOnce(null);
      const activities = createRunLifecycleActivities(db);

      const claimed = await activities.claimRun({
        runId: "run_1",
        agentId: "agent_1",
      });

      expect(claimed).toBe(false);
    });
  });

  describe("completeOrFailRun", () => {
    it("sets status COMPLETED on success with all fields", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.completeOrFailRun({
        runId: "run_1",
        teamId: "team_a",
        agentName: "Digest",
        success: true,
        summary: "all good",
        error: null,
        toolCallCount: 5,
        llmCallCount: 2,
      });

      expect(mockUpdateComputerRun).toHaveBeenCalledTimes(1);
      const [, runId, data] = mockUpdateComputerRun.mock.calls[0] ?? [];
      expect(runId).toBe("run_1");
      expect(data.status).toBe("COMPLETED");
      expect(data.summary).toBe("all good");
      expect(data.toolCallCount).toBe(5);
      expect(data.llmCallCount).toBe(2);
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it("sets status FAILED with error message", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.completeOrFailRun({
        runId: "run_1",
        teamId: "team_a",
        agentName: "Digest",
        success: false,
        summary: null,
        error: "rate_limited",
        toolCallCount: 0,
        llmCallCount: 0,
      });

      const [, , data] = mockUpdateComputerRun.mock.calls[0] ?? [];
      expect(data.status).toBe("FAILED");
      expect(data.error).toBe("rate_limited");
    });

    it("emits computer.run_completed event on success", async () => {
      const notify = vi.fn().mockResolvedValue(undefined);
      const activities = createRunLifecycleActivities(db, notify);

      await activities.completeOrFailRun({
        runId: "run_1",
        teamId: "team_a",
        agentName: "Digest",
        success: true,
        summary: "done",
        error: null,
        toolCallCount: 0,
        llmCallCount: 0,
      });

      expect(notify).toHaveBeenCalledWith(
        "team_a",
        "computer.run_completed",
        expect.objectContaining({
          runId: "run_1",
          agentName: "Digest",
          summary: "done",
        })
      );
    });

    it("emits computer.run_failed event on failure", async () => {
      const notify = vi.fn().mockResolvedValue(undefined);
      const activities = createRunLifecycleActivities(db, notify);

      await activities.completeOrFailRun({
        runId: "run_1",
        teamId: "team_a",
        agentName: "Digest",
        success: false,
        summary: null,
        error: "boom",
        toolCallCount: 0,
        llmCallCount: 0,
      });

      expect(notify).toHaveBeenCalledWith(
        "team_a",
        "computer.run_failed",
        expect.objectContaining({ summary: "boom" })
      );
    });

    it("swallows notification failures so DB status wins", async () => {
      const notify = vi.fn().mockRejectedValue(new Error("notify broke"));
      const activities = createRunLifecycleActivities(db, notify);

      await expect(
        activities.completeOrFailRun({
          runId: "run_1",
          teamId: "team_a",
          agentName: "Digest",
          success: true,
          summary: "done",
          error: null,
          toolCallCount: 0,
          llmCallCount: 0,
        })
      ).resolves.toBeUndefined();

      expect(mockUpdateComputerRun).toHaveBeenCalledTimes(1);
    });
  });

  describe("expireRun", () => {
    it("marks run FAILED with reason as error", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.expireRun({
        runId: "run_1",
        teamId: "team_a",
        reason: "approval_timeout",
      });

      const [, , data] = mockUpdateComputerRun.mock.calls[0] ?? [];
      expect(data.status).toBe("FAILED");
      expect(data.error).toBe("approval_timeout");
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it("handles skipped_concurrent reason", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.expireRun({
        runId: "run_1",
        teamId: "team_a",
        reason: "skipped_concurrent",
      });

      const [, , data] = mockUpdateComputerRun.mock.calls[0] ?? [];
      expect(data.error).toBe("skipped_concurrent");
    });
  });

  describe("rejectRun", () => {
    it("calls rejectComputerRun with runId and teamId", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.rejectRun({ runId: "run_1", teamId: "team_a" });

      expect(mockRejectComputerRun).toHaveBeenCalledWith(db, "run_1", "team_a");
    });
  });

  describe("setRunWorkflowId", () => {
    it("updates run with workflowId", async () => {
      const activities = createRunLifecycleActivities(db);

      await activities.setRunWorkflowId({
        runId: "run_1",
        workflowId: "computer:run_1",
      });

      const [, runId, data] = mockUpdateComputerRun.mock.calls[0] ?? [];
      expect(runId).toBe("run_1");
      expect(data.workflowId).toBe("computer:run_1");
    });
  });

  describe("failStaleRuns", () => {
    it("forwards staleMinutes and returns count", async () => {
      mockFailStaleRunningRuns.mockResolvedValueOnce(3);
      const activities = createRunLifecycleActivities(db);

      const count = await activities.failStaleRuns({ staleMinutes: 60 });

      expect(count).toBe(3);
      expect(mockFailStaleRunningRuns).toHaveBeenCalledWith(db, 60);
    });
  });
});
