import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import { exchangeMarketoCredentials } from "@openbeam/integrations";
import type {
  ConnectorResult,
  IntegrationServiceAccountAuth,
  ServiceAccountAuthContext,
} from "@openbeam/types/services";
import { createMarketoClient } from "./client";

type MarketoConfig = {
  munchkin_id?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class MarketoAuth implements IntegrationServiceAccountAuth {
  async authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as MarketoConfig;

    const munchkinId = config.munchkin_id;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (!(munchkinId && clientId && clientSecret)) {
      throw new Error(
        "Marketo credentials not configured: munchkin_id, client_id, and client_secret are required"
      );
    }

    try {
      const tokens = await exchangeMarketoCredentials({
        munchkinId,
        clientId,
        clientSecret,
      });

      const client = createMarketoClient({
        connectorId,
        accessToken: tokens.accessToken,
        munchkinId,
      });

      const healthy = await client.healthCheck();
      if (!healthy) {
        throw new Error(
          "Failed to validate Marketo credentials - health check failed"
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const result = await activateConnector(tx, connectorId, {
          workspaceExternalId: munchkinId,
          name: `Marketo (${munchkinId})`,
          config: {
            ...(current.config as object),
            munchkinId,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: result.id,
          app: AppType.MARKETO,
          accessToken: tokens.accessToken,
          refreshToken: "",
          expiresIn: tokens.expiresIn,
          scopes: [],
          clientId,
          clientSecret,
        });

        await createDefaultSyncJobs(tx, result.id);
        return result;
      });

      return { connector: updated };
    } catch (error) {
      await setConnectorError(
        prisma,
        connectorId,
        error instanceof Error ? error.message : "Authentication failed"
      );
      throw error;
    }
  }
}
