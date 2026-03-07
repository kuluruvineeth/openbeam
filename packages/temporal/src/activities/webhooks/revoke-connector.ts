import { ConnectorStatus, type Database, updateConnector } from "@openbeam/db";
import type { RevokeConnectorInput } from "./types";

export interface RevokeConnectorDependencies {
  db: Database;
}

export function createRevokeConnectorActivity(
  deps: RevokeConnectorDependencies
) {
  const { db } = deps;

  return async function revokeConnector(
    input: RevokeConnectorInput
  ): Promise<void> {
    await updateConnector(db, input.connectorId, {
      status: ConnectorStatus.AUTH_EXPIRED,
      lastError: input.reason,
      lastErrorAt: new Date(),
    });
  };
}
