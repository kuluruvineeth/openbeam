import type { Database } from "@openbeam/db";
import {
  getConnectorById,
  getDecryptedOAuthCredentials,
  getDisabledResourceExternalIds,
} from "@openbeam/db";
import type { ConnectorRecord } from "./types";

function parseConnectorConfig(config: unknown): Record<string, unknown> {
  if (config === null || config === undefined) {
    return {};
  }
  if (typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export interface LoadConnectorDeps {
  db: Database;
}

export function createLoadConnectorActivity(deps: LoadConnectorDeps) {
  const { db } = deps;

  return async function loadConnector(
    connectorId: string
  ): Promise<ConnectorRecord> {
    const connector = await getConnectorById(db, connectorId);
    const config = parseConnectorConfig(connector.config);
    const oauthCreds = await getDecryptedOAuthCredentials(db, connectorId);
    const disabledResourceIds = await getDisabledResourceExternalIds(
      db,
      connectorId
    );

    return {
      id: connector.id,
      type: connector.app,
      teamId: connector.teamId,
      workspaceExternalId: connector.workspaceExternalId,
      syncMode: connector.syncMode,
      lastSyncedAt: connector.lastSyncedAt,
      status: connector.status,
      config,
      oauthProvider: oauthCreds?.accessToken
        ? {
            accessToken: oauthCreds.accessToken,
            refreshToken: oauthCreds.refreshToken ?? "",
            expiresAt: oauthCreds.tokenExpiresAt ?? new Date(),
          }
        : undefined,
      disabledResourceIds: Array.from(disabledResourceIds),
    };
  };
}
