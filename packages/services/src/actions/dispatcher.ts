import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
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

export async function dispatchAction(
  request: DispatchRequest
): Promise<ActionExecutionResult> {
  const { credentials, connectorType: rawType } = await resolveCredentials(
    request.connectorId,
    request.teamId
  );

  const connectorType = normalizeType(rawType);

  const registry = actionsByConnector.get(connectorType);
  if (!registry) {
    return {
      success: false,
      data: {},
      error: `No actions defined for connector type: ${connectorType}`,
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
      success: false,
      data: { connectorType, actionId: request.actionId },
      error: `No executor registered for "${connectorType}". ${registered.length} executors available: ${registered.join(", ")}`,
    };
  }

  try {
    return await handler.execute(
      request.actionId,
      request.params,
      credentials,
      request.connectorId
    );
  } catch (error) {
    if (error instanceof ActionExecutorError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, data: {}, error: message };
  }
}
