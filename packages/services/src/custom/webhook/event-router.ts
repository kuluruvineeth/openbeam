import type {
  EventRouteResult,
  WebhookConfig,
} from "@openbeam/types/services/connectors/custom-webhook";
import { extractEventType } from "./transform";

export function routeEvent(
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  config: WebhookConfig
): EventRouteResult {
  const eventType = extractEventType(headers, payload, config);

  if (!(eventType || config.defaultMapping)) {
    return {
      shouldProcess: false,
      reason: "Cannot determine event type and no default mapping configured",
    };
  }

  if (
    config.eventFilter &&
    config.eventFilter.length > 0 &&
    eventType &&
    !config.eventFilter.includes(eventType)
  ) {
    return {
      shouldProcess: false,
      eventType,
      reason: `Event type "${eventType}" not in filter list`,
    };
  }

  const hasMapping =
    (eventType && config.eventMappings?.[eventType]) || config.defaultMapping;

  if (!hasMapping) {
    return {
      shouldProcess: false,
      eventType,
      reason: `No mapping for event type "${eventType}"`,
    };
  }

  return { shouldProcess: true, eventType };
}
