import prisma, { verifyConnectorOwnership } from "@openbeam/db";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import type {
  ConnectorActionExecuteResult,
  ConnectorActionNodeConfig,
} from "@openbeam/types/canvas";
import {
  ConnectorActionExecuteResultSchema,
  ConnectorActionNodeConfigSchema,
} from "@openbeam/types/canvas";
import { normalizeToConnectorType } from "@openbeam/types/services/connectors/events";
import { resolveCredentials } from "../../actions/credentials";
import { getHandler } from "../../actions/handler-registry";
import {
  getActionDefinition,
  registerConnectorActions,
} from "../../connector-actions/registry";
import "../../actions/handlers";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";
import {
  buildActionInputs,
  executeWithRetry,
  normalizeConnectorType,
  sanitizeOutput,
  toActionError,
} from "./connector-action-utils";

const DEFAULT_TIMEOUT_MS = 30_000;

let registriesReady = false;

function ensureRegistriesReady(): void {
  if (registriesReady) {
    return;
  }
  for (const registry of ALL_CONNECTOR_ACTION_REGISTRIES) {
    registerConnectorActions(registry);
  }
  registriesReady = true;
}

interface HandlerExecParams {
  connectorType: string;
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
  teamId: string;
}

async function executeViaHandler(
  params: HandlerExecParams
): Promise<Record<string, unknown>> {
  const { credentials } = await resolveCredentials(
    params.connectorId,
    params.teamId
  );

  const handler = getHandler(params.connectorType);
  if (!handler) {
    throw new Error(`No executor registered for "${params.connectorType}"`);
  }

  const result = await handler.execute(
    params.actionId,
    params.inputs,
    credentials,
    params.connectorId
  );

  if (!result.success) {
    throw new Error(result.error ?? `Action ${params.actionId} failed`);
  }

  return result.data;
}

export const connectorActionExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  let config: ConnectorActionNodeConfig | null = null;

  try {
    const parsedConfig = ConnectorActionNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    config = parsedConfig;

    const connectorType = parsedConfig.connectorType.trim();
    const connectorId = parsedConfig.connectorId?.trim();
    const actionId = parsedConfig.actionId.trim();

    if (!connectorType) {
      throw new Error("Connector type is required");
    }
    if (!connectorId) {
      throw new Error("Connector ID is required");
    }
    if (!actionId) {
      throw new Error("Action ID is required");
    }
    if (!context) {
      throw new Error("Execution context is required");
    }

    ensureRegistriesReady();

    const normalizedType = normalizeConnectorType(connectorType);
    const connector = await verifyConnectorOwnership(
      prisma,
      connectorId,
      context.teamId
    );

    if (!connector) {
      throw new Error("Connector not found or unauthorized");
    }

    const expectedType = normalizeToConnectorType(connector.app);
    if (
      expectedType &&
      normalizeConnectorType(expectedType) !== normalizedType
    ) {
      throw new Error(
        `Connector type mismatch: expected ${expectedType}, got ${normalizedType}`
      );
    }

    const action = getActionDefinition(normalizedType, actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    const inputs = buildActionInputs({
      action,
      config: parsedConfig,
      input,
      context,
      node,
    });

    const timeoutMs = parsedConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const { result, retryCount, durationMs } = await executeWithRetry({
      execute: () =>
        executeViaHandler({
          connectorType: normalizedType,
          actionId,
          inputs,
          connectorId,
          teamId: context.teamId,
        }),
      retryConfig: parsedConfig.retryConfig,
      timeoutMs,
    });

    const payload: ConnectorActionExecuteResult = {
      success: true,
      data: sanitizeOutput(result),
      metrics: { durationMs, retryCount },
    };

    return ConnectorActionExecuteResultSchema.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const actionError = toActionError(error);

    if (config?.continueOnError) {
      const payload: ConnectorActionExecuteResult = {
        success: false,
        error: actionError,
        metrics: { durationMs: 0 },
      };
      return ConnectorActionExecuteResultSchema.parse(payload);
    }

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
