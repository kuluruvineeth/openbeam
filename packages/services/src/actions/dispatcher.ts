import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { logger } from "../lib/logger";
import { resolveCredentials } from "./credentials";
import "./handlers";
import {
  ActionExecutorError,
  ActionNotFoundError,
  ActionValidationError,
} from "./errors";
import { getHandler, getRegisteredTypes } from "./handler-registry";
import type { ActionExecutionResult, DispatchRequest } from "./types";

const actionsByConnector = new Map(
  ALL_CONNECTOR_ACTION_REGISTRIES.map((r) => [
    r.connectorType.toLowerCase().replace(/-/g, "_"),
    r,
  ])
);

function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/-/g, "_");
}

type DispatchOutcome =
  | { kind: "success"; result: ActionExecutionResult; connectorType: string }
  | { kind: "failure"; error: unknown; connectorType: string | null };

function logDispatch(
  request: DispatchRequest,
  outcome: DispatchOutcome,
  durationMs: number
): void {
  const base = {
    actionId: request.actionId,
    connectorId: request.connectorId,
    teamId: request.teamId,
    userId: request.userId,
    source: request.source,
    durationMs,
  };

  if (outcome.kind === "success") {
    logger.info(
      {
        ...base,
        connectorType: outcome.connectorType,
        success: outcome.result.success,
      },
      "connector_action_dispatched"
    );
    return;
  }

  logger.error(
    {
      ...base,
      connectorType: outcome.connectorType,
      error:
        outcome.error instanceof Error
          ? {
              name: outcome.error.name,
              message: outcome.error.message,
            }
          : { message: String(outcome.error) },
    },
    "connector_action_dispatch_failed"
  );
}

async function runDispatch(
  request: DispatchRequest
): Promise<{ result: ActionExecutionResult; connectorType: string }> {
  const { credentials, connectorType: rawType } = await resolveCredentials(
    request.connectorId,
    request.teamId
  );

  const connectorType = normalizeType(rawType);

  const registry = actionsByConnector.get(connectorType);
  if (!registry) {
    return {
      connectorType,
      result: {
        success: false,
        data: {},
        error: `No actions defined for connector type: ${connectorType}`,
      },
    };
  }

  const actionDef = registry.actions.find((a) => a.id === request.actionId);
  if (!actionDef) {
    throw new ActionNotFoundError(connectorType, request.actionId);
  }

  const missingRequired = actionDef.inputs
    .filter((inp) => inp.required && !(inp.id in request.params))
    .map((inp) => inp.id);

  if (missingRequired.length > 0) {
    throw new ActionValidationError(
      `Missing required parameters: ${missingRequired.join(", ")}`
    );
  }

  const handler = getHandler(connectorType);
  if (!handler) {
    const registered = getRegisteredTypes();
    return {
      connectorType,
      result: {
        success: false,
        data: { connectorType, actionId: request.actionId },
        error: `No executor registered for "${connectorType}". ${registered.length} executors available: ${registered.join(", ")}`,
      },
    };
  }

  try {
    const result = await handler.execute(
      request.actionId,
      request.params,
      credentials,
      request.connectorId
    );
    return { connectorType, result };
  } catch (error) {
    if (error instanceof ActionExecutorError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      connectorType,
      result: { success: false, data: {}, error: message },
    };
  }
}

export async function dispatchAction(
  request: DispatchRequest
): Promise<ActionExecutionResult> {
  const startedAt = Date.now();
  try {
    const { result, connectorType } = await runDispatch(request);
    logDispatch(
      request,
      { kind: "success", result, connectorType },
      Date.now() - startedAt
    );
    return result;
  } catch (error) {
    logDispatch(
      request,
      { kind: "failure", error, connectorType: null },
      Date.now() - startedAt
    );
    throw error;
  }
}
