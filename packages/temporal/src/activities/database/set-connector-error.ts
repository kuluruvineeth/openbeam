import type { Database } from "@openbeam/db";
import { updateConnectorSyncError } from "@openbeam/db";

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
