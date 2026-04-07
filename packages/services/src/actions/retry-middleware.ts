import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";
import { ActionExecutorError } from "./errors";
import type { DispatchMiddleware } from "./middleware";

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

let definitions:
  | Map<string, Map<string, ConnectorActionDefinition>>
  | undefined;

function getDefinitions(): Map<string, Map<string, ConnectorActionDefinition>> {
  if (!definitions) {
    definitions = new Map(
      ALL_CONNECTOR_ACTION_REGISTRIES.map((r) => [
        r.connectorType.toLowerCase().replace(/-/g, "_"),
        new Map(r.actions.map((a) => [a.id, a])),
      ])
    );
  }
  return definitions;
}

export function findActionDefinition(
  connectorType: string,
  actionId: string
): ConnectorActionDefinition | undefined {
  const actions = getDefinitions().get(
    connectorType.toLowerCase().replace(/-/g, "_")
  );
  return actions?.get(actionId);
}

function shouldRetry(
  error: unknown,
  definition?: ConnectorActionDefinition
): boolean {
  if (!(error instanceof ActionExecutorError)) {
    return false;
  }
  if (!error.retryable) {
    return false;
  }
  if (!definition?.idempotent) {
    return false;
  }
  return true;
}

export function createIdempotentRetryMiddleware(
  lookupFn = findActionDefinition
): DispatchMiddleware {
  return async (request, next) => {
    const definition = request.connectorType
      ? lookupFn(request.connectorType, request.actionId)
      : undefined;

    if (!definition?.idempotent) {
      return await next();
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        return await next();
      } catch (error) {
        lastError = error;

        if (attempt < MAX_RETRIES && shouldRetry(error, definition)) {
          const backoff = BASE_BACKOFF_MS * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  };
}

export const idempotentRetryMiddleware: DispatchMiddleware =
  createIdempotentRetryMiddleware();
