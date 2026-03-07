import {
  type Database,
  getConnectorForSync,
  getDecryptedOAuthCredentials,
} from "@openbeam/db";
import { ApplicationFailure } from "@temporalio/common";
import type { BaseConnectorActivities, ConnectorRecord } from "./types";

export interface LoadConnectorDependencies {
  db: Database;
}

export function createLoadConnectorActivity(
  deps: LoadConnectorDependencies
): BaseConnectorActivities {
  const { db } = deps;

  return {
    async loadConnector(connectorId: string): Promise<ConnectorRecord> {
      const connector = await getConnectorForSync(db, connectorId);

      if (!connector) {
        throw ApplicationFailure.nonRetryable(
          `Connector ${connectorId} not found`,
          "ConnectorNotFoundError"
        );
      }

      const oauthCreds = await getDecryptedOAuthCredentials(db, connectorId);

      return {
        id: connector.id,
        type: connector.app,
        teamId: connector.teamId,
        status: connector.status,
        workspaceExternalId: connector.workspaceExternalId,
        syncMode: connector.syncMode,
        lastSyncedAt: connector.lastSyncedAt,
        config: connector.config as Record<string, unknown>,
        oauthProvider: oauthCreds?.accessToken
          ? {
              accessToken: oauthCreds.accessToken,
              refreshToken: oauthCreds.refreshToken ?? "",
              expiresAt: oauthCreds.tokenExpiresAt ?? new Date(),
            }
          : undefined,
      };
    },
  };
}
