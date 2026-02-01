import type { Database } from "@openplane/db";
import { updateConnectorSyncError } from "@openplane/db";

export interface SetConnectorErrorDeps {
  db: Database;
}

export interface SetConnectorErrorInput {
  connectorId: string;
  error: string;
}

export function createSetConnectorErrorActivity(deps: SetConnectorErrorDeps) {
  const { db } = deps;

  return async function setConnectorError(
    input: SetConnectorErrorInput
  ): Promise<void> {
    await updateConnectorSyncError(db, {
      connectorId: input.connectorId,
      errorMessage: input.error,
    });
  };
}
