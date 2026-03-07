import type { Database } from "@openbeam/db";
import { Context } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/common";
import type {
  ExecuteAdapterInput,
  ExecuteAdapterOutput,
} from "./control-types";

export interface ControlExecuteDependencies {
  db: Database;
}

export function createControlExecuteActivity(deps: ControlExecuteDependencies) {
  return async function executeAdapter(
    input: ExecuteAdapterInput
  ): Promise<ExecuteAdapterOutput> {
    const { getAdapterOrThrow } = await import(
      "@openbeam/services/control/adapters/registry"
    );
    const { resolveEnvBindings } = await import(
      "@openbeam/services/control/secrets"
    );

    const adapter = getAdapterOrThrow(input.adapterType);

    const envConfig =
      input.adapterConfig.env && typeof input.adapterConfig.env === "object"
        ? (input.adapterConfig.env as Record<string, unknown>)
        : {};

    const resolvedEnv = await resolveEnvBindings(
      deps.db,
      input.teamId,
      envConfig
    );

    const heartbeatInterval = setInterval(() => {
      Context.current().heartbeat({
        agentId: input.agentId,
        runId: input.runId,
      });
    }, 10_000);

    try {
      const result = await adapter.execute({
        runId: input.runId,
        context: {
          runId: input.runId,
          agent: {
            id: input.agentId,
            teamId: input.teamId,
            name: input.agentName,
            adapterType: input.adapterType,
            adapterConfig: input.adapterConfig,
          },
          runtime: {
            sessionId: input.sessionId ?? null,
            sessionParams: input.sessionParams,
            sessionDisplayId: null,
            taskKey: null,
          },
          config: input.adapterConfig,
          context: {
            payload: input.payload,
            reason: input.reason,
          },
        },
        config: input.adapterConfig,
        env: resolvedEnv,
        onLog: () => {
          Context.current().heartbeat({ type: "log" });
          return Promise.resolve();
        },
      });

      if (
        result.errorCode === "BUDGET_EXCEEDED" ||
        result.errorMessage?.includes("budget")
      ) {
        throw ApplicationFailure.nonRetryable(
          result.errorMessage ?? "Budget exceeded",
          "BudgetExceededError"
        );
      }

      return {
        exitCode: result.exitCode,
        signal: result.signal,
        timedOut: result.timedOut,
        errorMessage: result.errorMessage,
        sessionId: result.sessionId,
        sessionParams: result.sessionParams,
        provider: result.provider,
        model: result.model,
        costUsd: result.costUsd,
        resultJson: result.resultJson,
        raw: result,
      };
    } catch (error) {
      if (error instanceof ApplicationFailure) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "Unknown adapter error";
      throw ApplicationFailure.retryable(message, "AdapterExecutionError");
    } finally {
      clearInterval(heartbeatInterval);
    }
  };
}
