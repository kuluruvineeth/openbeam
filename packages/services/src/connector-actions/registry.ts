import type {
  ConnectorActionDefinition,
  ConnectorActionsRegistry,
} from "@openbeam/types/canvas";

const registries = new Map<string, ConnectorActionsRegistry>();

export function registerConnectorActions(
  registry: ConnectorActionsRegistry
): void {
  registries.set(registry.connectorType, registry);
}

export function getConnectorActions(
  connectorType: string
): ConnectorActionsRegistry | undefined {
  return registries.get(connectorType);
}

export function getAllConnectorActions(): ConnectorActionsRegistry[] {
  return Array.from(registries.values());
}

export function getActionDefinition(
  connectorType: string,
  actionId: string
): ConnectorActionDefinition | undefined {
  const registry = registries.get(connectorType);
  return registry?.actions.find((a) => a.id === actionId);
}

export function getResourcesForConnector(connectorType: string): string[] {
  const registry = registries.get(connectorType);
  if (!registry) {
    return [];
  }
  const resources = new Set(registry.actions.map((a) => a.resource));
  return Array.from(resources);
}

export function getOperationsForResource(
  connectorType: string,
  resource: string
): ConnectorActionDefinition[] {
  const registry = registries.get(connectorType);
  if (!registry) {
    return [];
  }
  return registry.actions.filter((a) => a.resource === resource);
}
