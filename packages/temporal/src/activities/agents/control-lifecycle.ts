import type { Database } from "@openbeam/db";
import { ApplicationFailure } from "@temporalio/common";
import type {
  ClaimAndStartRunInput,
  ClaimAndStartRunOutput,
  CompleteRunInput,
  EnqueueTimerWakeupInput,
  FailRunInput,
  LoadAgentForRunInput,
  LoadAgentForRunOutput,
  LoadAgentTimerConfigOutput,
  LoadPendingWakeupRequestsInput,
  LoadPendingWakeupRequestsOutput,
  ReapOrphanedRunsInput,
  ReapOrphanedRunsOutput,
  UpdateRuntimeStateInput,
} from "./control-types";

export interface ControlLifecycleDependencies {
  db: Database;
}

export function createControlLifecycleActivities(
  deps: ControlLifecycleDependencies
) {
  return {
    async loadAgentForRun(
      input: LoadAgentForRunInput
    ): Promise<LoadAgentForRunOutput> {
      const { findControlAgentById } = await import("@openbeam/db");
      const agent = await findControlAgentById(
        deps.db,
        input.agentId,
        input.teamId
      );

      if (!agent) {
        throw ApplicationFailure.nonRetryable(
          `Agent ${input.agentId} not found`,
          "AgentNotFoundError"
        );
      }

      if (agent.status === "TERMINATED") {
        throw ApplicationFailure.nonRetryable(
          `Agent ${input.agentId} is terminated`,
          "AgentTerminatedError"
        );
      }

      const adapterConfig =
        agent.adapterConfig && typeof agent.adapterConfig === "object"
          ? (agent.adapterConfig as Record<string, unknown>)
          : {};
      const runtimeConfig =
        agent.runtimeConfig && typeof agent.runtimeConfig === "object"
          ? (agent.runtimeConfig as Record<string, unknown>)
          : {};

      return {
        id: agent.id,
        teamId: agent.teamId,
        name: agent.name,
        adapterType: agent.adapterType,
        adapterConfig,
        runtimeConfig,
        status: agent.status,
        budgetMonthlyCents: agent.budgetMonthlyCents,
        spentMonthlyCents: agent.spentMonthlyCents,
      };
    },

    async claimAndStartRun(
      input: ClaimAndStartRunInput
    ): Promise<ClaimAndStartRunOutput> {
      const { claimAndStartRun } = await import(
        "@openbeam/services/control/heartbeat"
      );
      const result = await claimAndStartRun(deps.db, {
        teamId: input.teamId,
        agentId: input.agentId,
        runId: input.runId,
        wakeupRequestId: input.wakeupRequestId,
      });
      return { sessionIdBefore: result.sessionIdBefore };
    },

    async completeRun(input: CompleteRunInput): Promise<void> {
      const { completeRunWithResult } = await import(
        "@openbeam/services/control/heartbeat"
      );
      await completeRunWithResult(deps.db, {
        teamId: input.teamId,
        agentId: input.agentId,
        runId: input.runId,
        wakeupRequestId: input.wakeupRequestId,
        result: input.result,
      });
    },

    async failRun(input: FailRunInput): Promise<void> {
      const { failRunWithError } = await import(
        "@openbeam/services/control/heartbeat"
      );
      await failRunWithError(deps.db, {
        teamId: input.teamId,
        agentId: input.agentId,
        runId: input.runId,
        wakeupRequestId: input.wakeupRequestId,
        error: input.error,
        errorCode: input.errorCode,
      });
    },

    async updateRuntimeState(input: UpdateRuntimeStateInput): Promise<void> {
      const { ensureRuntimeState, updateRuntimeSession } = await import(
        "@openbeam/services/control/heartbeat"
      );
      await ensureRuntimeState(deps.db, {
        agentId: input.agentId,
        teamId: input.teamId,
        adapterType: input.adapterType,
      });
      if (input.sessionId || input.lastRunId) {
        await updateRuntimeSession(deps.db, {
          agentId: input.agentId,
          teamId: input.teamId,
          adapterType: input.adapterType,
          sessionId: input.sessionId,
          stateJson: input.stateJson,
          lastRunId: input.lastRunId,
          lastRunStatus: input.lastRunStatus,
        });
      }
    },

    async reapOrphanedRuns(
      input: ReapOrphanedRunsInput
    ): Promise<ReapOrphanedRunsOutput> {
      const { reapOrphanedRuns: reapOrphans } = await import(
        "@openbeam/services/control/heartbeat"
      );
      return await reapOrphans(deps.db, input.teamId, input.staleThresholdMs);
    },

    async loadPendingWakeupRequests(
      input: LoadPendingWakeupRequestsInput
    ): Promise<LoadPendingWakeupRequestsOutput> {
      const { findControlAgentById } = await import("@openbeam/db");

      const requests = await deps.db.controlAgentWakeupRequest.findMany({
        where: { teamId: input.teamId, status: "QUEUED" },
        orderBy: { requestedAt: "asc" },
        take: input.limit ?? 20,
      });

      const results = await Promise.all(
        requests.map(async (req) => {
          const agent = await findControlAgentById(
            deps.db,
            req.agentId,
            input.teamId
          );
          if (!agent) {
            return null;
          }

          const adapterConfig =
            agent.adapterConfig && typeof agent.adapterConfig === "object"
              ? (agent.adapterConfig as Record<string, unknown>)
              : {};
          const runtimeConfig =
            agent.runtimeConfig && typeof agent.runtimeConfig === "object"
              ? (agent.runtimeConfig as Record<string, unknown>)
              : {};

          return {
            id: req.id,
            agentId: req.agentId,
            adapterType: agent.adapterType,
            adapterConfig,
            runtimeConfig,
            payload: req.payload as Record<string, unknown> | undefined,
            reason: req.reason ?? undefined,
            source: req.source,
          };
        })
      );

      return {
        requests: results.filter((r): r is NonNullable<typeof r> => r !== null),
      };
    },

    async loadAgentTimerConfig(
      input: LoadAgentForRunInput
    ): Promise<LoadAgentTimerConfigOutput> {
      const { findControlAgentById } = await import("@openbeam/db");
      const agent = await findControlAgentById(
        deps.db,
        input.agentId,
        input.teamId
      );

      if (!agent) {
        throw ApplicationFailure.nonRetryable(
          `Agent ${input.agentId} not found`,
          "AgentNotFoundError"
        );
      }

      const config =
        agent.runtimeConfig && typeof agent.runtimeConfig === "object"
          ? (agent.runtimeConfig as Record<string, unknown>)
          : {};

      const enabled = config.heartbeatEnabled !== false;
      const intervalSec =
        typeof config.heartbeatIntervalSec === "number"
          ? config.heartbeatIntervalSec
          : 0;

      return {
        enabled: enabled && intervalSec > 0,
        intervalSec,
        agentId: agent.id,
        teamId: agent.teamId,
      };
    },

    async enqueueTimerWakeup(input: EnqueueTimerWakeupInput): Promise<void> {
      const { enqueueWakeup } = await import(
        "@openbeam/services/control/heartbeat"
      );
      await enqueueWakeup(deps.db, input.teamId, input.agentId, {
        source: "TIMER",
      });
    },
  };
}
