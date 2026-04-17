import type { Database } from "@openbeam/db";
import {
  claimComputerRun,
  createComputerRun,
  failStaleRunningRuns,
  rejectComputerRun,
  updateComputerRun,
} from "@openbeam/db";
import type {
  ComputerRunStatus,
  ComputerTriggerType,
} from "@openbeam/types/computer";

export type NotifyFn = (
  teamId: string,
  eventType: string,
  payload: Record<string, unknown>
) => Promise<void>;

const noopNotify: NotifyFn = () => Promise.resolve();

export function createRunLifecycleActivities(
  db: Database,
  notify: NotifyFn = noopNotify
) {
  return {
    async createAndClaimRun(input: {
      agentId: string;
      teamId: string;
      triggeredBy?: ComputerTriggerType;
      triggeredByUser?: string;
    }): Promise<string> {
      const runId = crypto.randomUUID();
      await createComputerRun(db, {
        id: runId,
        agentId: input.agentId,
        teamId: input.teamId,
        triggeredBy: input.triggeredBy,
        triggeredByUser: input.triggeredByUser,
      });
      return runId;
    },

    async claimRun(input: {
      runId: string;
      agentId: string;
    }): Promise<boolean> {
      const claimed = await claimComputerRun(db, input.runId, input.agentId);
      return claimed !== null;
    },

    async completeOrFailRun(input: {
      runId: string;
      teamId: string;
      agentName: string;
      success: boolean;
      summary?: string | null;
      error?: string | null;
      toolCallCount: number;
      llmCallCount: number;
    }): Promise<void> {
      const status = input.success ? "COMPLETED" : "FAILED";
      await updateComputerRun(db, input.runId, {
        status: status as ComputerRunStatus,
        summary: input.summary ?? null,
        error: input.error ?? null,
        toolCallCount: input.toolCallCount,
        llmCallCount: input.llmCallCount,
        completedAt: new Date(),
      });

      const eventType = input.success
        ? "computer.run_completed"
        : "computer.run_failed";
      await notify(input.teamId, eventType, {
        runId: input.runId,
        agentName: input.agentName,
        summary: input.summary ?? input.error ?? status,
      });
    },

    async expireRun(input: { runId: string; reason: string }): Promise<void> {
      await updateComputerRun(db, input.runId, {
        status: "FAILED" as ComputerRunStatus,
        error: input.reason,
        completedAt: new Date(),
      });
    },

    async rejectRun(input: { runId: string }): Promise<void> {
      await rejectComputerRun(db, input.runId);
    },

    async setRunWorkflowId(input: {
      runId: string;
      workflowId: string;
    }): Promise<void> {
      await updateComputerRun(db, input.runId, {
        workflowId: input.workflowId,
      });
    },

    failStaleRuns(input: { staleMinutes: number }): Promise<number> {
      return failStaleRunningRuns(db, input.staleMinutes);
    },
  };
}

export type RunLifecycleActivities = ReturnType<
  typeof createRunLifecycleActivities
>;
