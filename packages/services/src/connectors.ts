import {
  type Database,
  getSyncHistory,
  getSyncStatus,
  pauseConnector,
  resumeConnector,
  triggerSync,
  verifyConnectorOwnership,
} from "@openbeam/db";
import { createResolveTeamId } from "./lib/service-errors";

export type ConnectorSyncType = "FULL" | "INCREMENTAL";

export type ConnectorServiceErrorCode =
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "INVALID_STATE";

export class ConnectorServiceError extends Error {
  readonly code: ConnectorServiceErrorCode;

  constructor(code: ConnectorServiceErrorCode, message: string) {
    super(message);
    this.name = "ConnectorServiceError";
    this.code = code;
  }
}

export interface TeamScopedConnectorInput {
  connectorId: string;
  teamId: string | null;
}

export interface CreateManualConnectorSyncInput
  extends TeamScopedConnectorInput {
  type: ConnectorSyncType;
}

const resolveTeamId = createResolveTeamId(ConnectorServiceError);

async function resolveOwnedConnector(
  db: Database,
  input: TeamScopedConnectorInput
) {
  const teamId = resolveTeamId(input.teamId);
  const connector = await verifyConnectorOwnership(
    db,
    input.connectorId,
    teamId
  );
  if (!connector) {
    throw new ConnectorServiceError("NOT_FOUND", "Connector not found");
  }
  return connector;
}

function normalizeConnectorType(app: string): string {
  return app.toLowerCase().replace(/_/g, "-");
}

export async function createManualConnectorSyncForTeam(
  db: Database,
  input: CreateManualConnectorSyncInput
): Promise<{
  syncHistoryId: string;
  syncType: ConnectorSyncType;
  connectorType: string;
}> {
  const connector = await resolveOwnedConnector(db, input);
  if (connector.status === "INACTIVE" || connector.status === "ERROR") {
    throw new ConnectorServiceError(
      "INVALID_STATE",
      "Connector is not active. Check connector status."
    );
  }

  const syncResult = await triggerSync(db, {
    connectorId: input.connectorId,
    type: input.type,
  });

  return {
    syncHistoryId: syncResult.syncHistoryId,
    syncType: input.type,
    connectorType: normalizeConnectorType(connector.app),
  };
}

export async function getConnectorSyncHistoryForTeam(
  db: Database,
  input: TeamScopedConnectorInput & {
    limit: number;
    offset: number;
  }
) {
  await resolveOwnedConnector(db, input);
  return getSyncHistory(db, input.connectorId, {
    limit: input.limit,
    offset: input.offset,
  });
}

export async function getConnectorSyncStatusForTeam(
  db: Database,
  input: TeamScopedConnectorInput
) {
  await resolveOwnedConnector(db, input);
  const syncStatus = await getSyncStatus(db, input.connectorId);
  if (!syncStatus) {
    throw new ConnectorServiceError("NOT_FOUND", "Connector not found");
  }
  return syncStatus;
}

export async function pauseConnectorForTeam(
  db: Database,
  input: TeamScopedConnectorInput
): Promise<{ success: boolean; message: string }> {
  await resolveOwnedConnector(db, input);
  const result = await pauseConnector(db, input.connectorId);
  if (result.success) {
    return {
      success: true,
      message: "Connector set to inactive successfully",
    };
  }
  return result;
}

export async function resumeConnectorForTeam(
  db: Database,
  input: TeamScopedConnectorInput
) {
  await resolveOwnedConnector(db, input);
  return resumeConnector(db, input.connectorId);
}
