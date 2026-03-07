import type { ConnectorStatus, Database } from "@openbeam/db";
import { updateConnector } from "@openbeam/db";

export interface SetConnectorStatusDeps {
  db: Database;
}

export interface SetConnectorStatusInput {
  connectorId: string;
  status: ConnectorStatus;
}

export function createSetConnectorStatusActivity(deps: SetConnectorStatusDeps) {
  const { db } = deps;

  return async function setConnectorStatus(
    input: SetConnectorStatusInput
  ): Promise<void> {
    await updateConnector(db, input.connectorId, {
      status: input.status,
    });
  };
}
