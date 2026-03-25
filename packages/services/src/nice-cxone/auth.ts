import prisma, {
  type AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import { exchangeNiceCxoneCredentials } from "@openbeam/integrations";
import type {
  ConnectorResult,
  IntegrationServiceAccountAuth,
  ServiceAccountAuthContext,
} from "@openbeam/types/services";
import { createNiceCxoneClient } from "./client";

type NiceCxoneConfig = {
  base_url?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class NiceCxoneAuth implements IntegrationServiceAccountAuth {
  async authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as NiceCxoneConfig;

    const baseUrlRaw = config.base_url;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (!(baseUrlRaw && clientId && clientSecret)) {
      throw new Error(
        "NICE CXone credentials not configured: base_url, client_id, and client_secret are required"
      );
    }

    try {
      const tokens = await exchangeNiceCxoneCredentials({
        baseUrl: baseUrlRaw,
        clientId,
        clientSecret,
      });

      const client = createNiceCxoneClient({
        connectorId,
        accessToken: tokens.accessToken,
        baseUrl: tokens.baseUrl,
      });

      const healthy = await client.healthCheck();
      if (!healthy) {
        throw new Error(
          "Failed to validate NICE CXone credentials - health check failed"
        );
      }

      const instanceName = new URL(tokens.baseUrl).hostname.split(".")[0];

      const updated = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const result = await activateConnector(tx, connectorId, {
          workspaceExternalId: instanceName ?? connectorId,
          name: `NICE CXone (${instanceName})`,
          config: {
            ...(current.config as object),
            baseUrl: tokens.baseUrl,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: result.id,
          app: "NICE_CXONE" as AppType,
          accessToken: tokens.accessToken,
          refreshToken: "",
          expiresIn: tokens.expiresIn,
          scopes: ["read"],
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
