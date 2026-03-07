import type { Database } from "@openbeam/db";
import { findConnectorById } from "@openbeam/db";

export interface LoadConnectorDependencies {
  db: Database;
}

export function createLoadConnectorActivity(deps: LoadConnectorDependencies) {
  const { db } = deps;

  return async function loadConnector(
    connectorId: string
  ): Promise<{ id: string; type: string }> {
    const connector = await findConnectorById(db, connectorId);

    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    return { id: connector.id, type: connector.app };
  };
}
