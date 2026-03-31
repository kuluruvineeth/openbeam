import db, { findConnectorById } from "@openbeam/db";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { executeConnectorAction } from "../canvas/executors/connector-action";
import {
  ActionExecutorError,
  ActionNotFoundError,
  ActionValidationError,
} from "./errors";
import type { ActionExecutionResult } from "./types";

const actionsByConnector = new Map(
  ALL_CONNECTOR_ACTION_REGISTRIES.map((r) => [
    r.connectorType.toLowerCase().replace(/-/g, "_"),
    r,
  ])
);

export interface DispatchRequest {
  connectorId: string;
  actionId: string;
  params: Record<string, unknown>;
  teamId: string;
  userId: string;
  source: "mcp" | "canvas" | "api" | "agent";
}

function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/-/g, "_");
}

export async function dispatchAction(
  request: DispatchRequest
): Promise<ActionExecutionResult> {
  const connector = await findConnectorById(db, request.connectorId);

  if (!connector || connector.teamId !== request.teamId) {
    return {
      success: false,
      data: {},
      error: "Connector not found or access denied",
    };
  }

  const type = normalizeType(connector.app);

  const registry = actionsByConnector.get(type);
  if (!registry) {
    return {
      success: false,
      data: {},
      error: `No actions available for connector type: ${type}`,
    };
  }

  const actionDef = registry.actions.find((a) => a.id === request.actionId);
  if (!actionDef) {
    throw new ActionNotFoundError(type, request.actionId);
  }

  const missingRequired = actionDef.inputs
    .filter((inp) => inp.required && !(inp.id in request.params))
    .map((inp) => inp.id);

  if (missingRequired.length > 0) {
    throw new ActionValidationError(
      `Missing required parameters: ${missingRequired.join(", ")}`
    );
  }

  try {
    const result = await executeConnectorAction({
      connectorType: type,
      actionId: request.actionId,
      inputs: request.params,
      connectorId: request.connectorId,
      connectorConfig: {},
      timeoutMs: 30_000,
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ActionExecutorError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Unsupported connector type")) {
      return {
        success: false,
        data: { connectorType: type, actionId: request.actionId },
        error: `Connector type "${type}" does not have an executor yet. Supported: slack, gmail, notion, google_drive, linear.`,
      };
    }

    return { success: false, data: {}, error: message };
  }
}
