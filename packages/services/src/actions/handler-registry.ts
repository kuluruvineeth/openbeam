import type { ConnectorHandler } from "./types";

const handlers = new Map<string, ConnectorHandler>();

export function registerHandler(handler: ConnectorHandler): void {
  const key = handler.connectorType.toLowerCase().replace(/-/g, "_");
  handlers.set(key, handler);
}

export function getHandler(
  connectorType: string
): ConnectorHandler | undefined {
  return handlers.get(connectorType.toLowerCase().replace(/-/g, "_"));
}

export function getRegisteredTypes(): string[] {
  return [...handlers.keys()];
}
