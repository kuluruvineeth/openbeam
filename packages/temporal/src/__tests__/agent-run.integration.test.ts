import { fileURLToPath } from "node:url";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  approvalSignal,
  rejectionSignal,
} from "../workflows/computer/agent-run";

type ExecuteResult = {
  success: boolean;
  proposalSubmitted: boolean;
  result?: unknown;
  error?: string;
  steps?: unknown[];
  toolCallCount: number;
  llmCallCount: number;
};

type ReplayResult = ExecuteResult;

interface FakeState {
  claimed: boolean;
  lastCreatedRunId: string | null;
  executeResults: ExecuteResult[];
  replayResults: ReplayResult[];
  lifecycle: string[];
  workflowIdsRecorded: string[];
  completeOrFailCalls: Array<{
    runId: string;
    success: boolean;
    summary: string | null;
    error: string | null;
    toolCallCount: number;
    llmCallCount: number;
  }>;
  expireReasons: string[];
  rejectRunCalls: number;
}

const TASK_QUEUE = "test-agent-run";

function createFakeActivities(state: FakeState) {
  return {
    createAndClaimRun: (input: { agentId: string; teamId: string }) => {
      const runId = `run_${input.agentId}_${Date.now()}`;
      state.lastCreatedRunId = runId;
      state.lifecycle.push("createAndClaimRun");
      return Promise.resolve(runId);
    },

    setRunWorkflowId: (input: { runId: string; workflowId: string }) => {
      state.workflowIdsRecorded.push(input.workflowId);
      state.lifecycle.push("setRunWorkflowId");
      return Promise.resolve();
    },

    claimRun: (_input: { runId: string; agentId: string }) => {
      state.lifecycle.push("claimRun");
      return Promise.resolve(state.claimed);
    },

    executeComputerAgent: (_input: {
      agentId: string;
      teamId: string;
      runId: string;
    }) => {
      state.lifecycle.push("executeComputerAgent");
      const next = state.executeResults.shift();
      if (!next) {
        throw new Error("no executeResult queued");
      }
      return Promise.resolve(next);
    },

    replayApprovedActions: (_input: {
      runId: string;
      agentId: string;
      teamId: string;
      actions: unknown[];
    }) => {
      state.lifecycle.push("replayApprovedActions");
      const next = state.replayResults.shift();
      if (!next) {
        throw new Error("no replayResult queued");
      }
      return Promise.resolve(next);
    },

    completeOrFailRun: (input: {
      runId: string;
      success: boolean;
      summary?: string | null;
      error?: string | null;
      toolCallCount: number;
      llmCallCount: number;
    }) => {
      state.completeOrFailCalls.push({
        runId: input.runId,
        success: input.success,
        summary: input.summary ?? null,
        error: input.error ?? null,
        toolCallCount: input.toolCallCount,
        llmCallCount: input.llmCallCount,
      });
      state.lifecycle.push("completeOrFailRun");
      return Promise.resolve();
    },

    expireRun: (input: { runId: string; teamId: string; reason: string }) => {
      state.expireReasons.push(input.reason);
      state.lifecycle.push("expireRun");
      return Promise.resolve();
    },

    rejectRun: (_input: { runId: string; teamId: string }) => {
      state.rejectRunCalls += 1;
      state.lifecycle.push("rejectRun");
      return Promise.resolve();
    },

    failStaleRuns: (_input: { staleMinutes: number }) => Promise.resolve(0),
  };
}

function freshState(): FakeState {
  return {
    claimed: true,
    lastCreatedRunId: null,
    executeResults: [],
    replayResults: [],
    lifecycle: [],
    workflowIdsRecorded: [],
    completeOrFailCalls: [],
    expireReasons: [],
    rejectRunCalls: 0,
  };
}

describe("agentRunWorkflow integration", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let workerPromise: Promise<void> | undefined;
  const state = freshState();

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: TASK_QUEUE,
      workflowsPath: fileURLToPath(
        new URL("../workflows/computer/agent-run.ts", import.meta.url)
      ),
      activities: createFakeActivities(state),
    });

    workerPromise = worker.run();
  }, 180_000);

  afterAll(async () => {
    await worker?.shutdown();
    await workerPromise;
    await env?.teardown();
  });

  beforeEach(() => {
    state.claimed = true;
    state.lastCreatedRunId = null;
    state.executeResults.length = 0;
    state.replayResults.length = 0;
    state.lifecycle.length = 0;
    state.workflowIdsRecorded.length = 0;
    state.completeOrFailCalls.length = 0;
    state.expireReasons.length = 0;
    state.rejectRunCalls = 0;
  });

  describe("happy path (no proposals)", () => {
    it("claims, executes, and completes a successful run", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: false,
        result: "all good",
        toolCallCount: 3,
        llmCallCount: 1,
      });

      const result = (await env.client.workflow.execute("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_happy",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "MANUAL",
            triggeredByUser: "user_1",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Digest",
          },
        ],
      })) as { runId: string; status: string };

      expect(result.status).toBe("COMPLETED");
      expect(state.lifecycle).toEqual([
        "createAndClaimRun",
        "setRunWorkflowId",
        "claimRun",
        "executeComputerAgent",
        "completeOrFailRun",
      ]);
      expect(state.completeOrFailCalls[0]).toMatchObject({
        success: true,
        summary: "all good",
        toolCallCount: 3,
        llmCallCount: 1,
      });
    });

    it("marks run FAILED when execute returns success=false", async () => {
      state.executeResults.push({
        success: false,
        proposalSubmitted: false,
        error: "rate_limited",
        toolCallCount: 1,
        llmCallCount: 0,
      });

      const result = (await env.client.workflow.execute("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_fail",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "SCHEDULE",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Digest",
          },
        ],
      })) as { runId: string; status: string };

      expect(result.status).toBe("FAILED");
      expect(state.completeOrFailCalls[0]).toMatchObject({
        success: false,
        error: "rate_limited",
      });
    });
  });

  describe("concurrent run guard", () => {
    it("skips execution when claim fails", async () => {
      state.claimed = false;

      const result = (await env.client.workflow.execute("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_skip",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "SCHEDULE",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Digest",
          },
        ],
      })) as { runId: string; status: string };

      expect(result.status).toBe("FAILED");
      expect(state.expireReasons).toEqual(["skipped_concurrent"]);
      expect(state.lifecycle).not.toContain("executeComputerAgent");
    });
  });

  describe("proposal approval flow", () => {
    it("pauses on proposal, resumes on approval signal, replays actions", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: true,
        toolCallCount: 2,
        llmCallCount: 1,
      });
      state.replayResults.push({
        success: true,
        proposalSubmitted: false,
        result: "replay ok",
        toolCallCount: 1,
        llmCallCount: 0,
      });

      const handle = await env.client.workflow.start("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_approve",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "MANUAL",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Stale Detector",
            approvalTimeoutMs: 60_000,
          },
        ],
      });

      const deadline = Date.now() + 30_000;
      while (
        Date.now() < deadline &&
        !state.lifecycle.includes("executeComputerAgent")
      ) {
        await env.sleep(50);
      }

      await handle.signal(approvalSignal, {
        approvedActions: [
          { tool: "archive", args: { uri: "doc_1" } },
          { tool: "archive", args: { uri: "doc_2" } },
        ],
        reviewedBy: "alice",
      });

      const result = (await handle.result()) as {
        runId: string;
        status: string;
      };

      expect(result.status).toBe("COMPLETED");
      expect(state.lifecycle).toContain("replayApprovedActions");
      expect(state.completeOrFailCalls[0]).toMatchObject({
        success: true,
        summary: "replay ok",
        toolCallCount: 3,
        llmCallCount: 1,
      });
    });

    it("marks run FAILED and calls rejectRun when rejection signal arrives", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: true,
        toolCallCount: 1,
        llmCallCount: 0,
      });

      const handle = await env.client.workflow.start("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_reject",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "MANUAL",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Stale Detector",
            approvalTimeoutMs: 60_000,
          },
        ],
      });

      const deadline = Date.now() + 30_000;
      while (
        Date.now() < deadline &&
        !state.lifecycle.includes("executeComputerAgent")
      ) {
        await env.sleep(50);
      }

      await handle.signal(rejectionSignal, {
        reviewedBy: "alice",
        note: "false positive",
      });

      const result = (await handle.result()) as {
        runId: string;
        status: string;
      };

      expect(result.status).toBe("FAILED");
      expect(state.rejectRunCalls).toBe(1);
      expect(state.lifecycle).not.toContain("replayApprovedActions");
    });

    it("times out and expires when approval never arrives", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: true,
        toolCallCount: 1,
        llmCallCount: 0,
      });

      const result = (await env.client.workflow.execute("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_timeout",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "SCHEDULE",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "Stale Detector",
            approvalTimeoutMs: 100,
          },
        ],
      })) as { runId: string; status: string };

      expect(result.status).toBe("TIMED_OUT");
      expect(state.expireReasons).toContain("approval_timeout");
      expect(state.rejectRunCalls).toBe(0);
    });

    it("first signal wins — late rejection after approval is ignored", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: true,
        toolCallCount: 1,
        llmCallCount: 0,
      });
      state.replayResults.push({
        success: true,
        proposalSubmitted: false,
        result: "ok",
        toolCallCount: 0,
        llmCallCount: 0,
      });

      const handle = await env.client.workflow.start("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_race",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "MANUAL",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "X",
            approvalTimeoutMs: 60_000,
          },
        ],
      });

      const deadline = Date.now() + 30_000;
      while (
        Date.now() < deadline &&
        !state.lifecycle.includes("executeComputerAgent")
      ) {
        await env.sleep(50);
      }

      await handle.signal(approvalSignal, {
        approvedActions: [],
        reviewedBy: "alice",
      });
      await handle.signal(rejectionSignal, {
        reviewedBy: "bob",
      });

      const result = (await handle.result()) as {
        runId: string;
        status: string;
      };

      expect(result.status).toBe("COMPLETED");
      expect(state.rejectRunCalls).toBe(0);
    });
  });

  describe("workflow ID recording", () => {
    it("calls setRunWorkflowId with the actual running workflow ID", async () => {
      state.executeResults.push({
        success: true,
        proposalSubmitted: false,
        result: "ok",
        toolCallCount: 0,
        llmCallCount: 0,
      });

      await env.client.workflow.execute("agentRunWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "computer:run_wfid",
        args: [
          {
            agentId: "agent_1",
            teamId: "team_a",
            triggerType: "MANUAL",
            notifyChannels: [],
            memoryEnabled: true,
            agentName: "X",
          },
        ],
      });

      expect(state.workflowIdsRecorded).toContain("computer:run_wfid");
    });
  });
});
