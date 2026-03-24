import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import { exchangeDoceboCredentials } from "@openbeam/integrations";
import type {
  ConnectorResult,
  IntegrationServiceAccountAuth,
  ServiceAccountAuthContext,
} from "@openbeam/types/services";
import { createDoceboClient } from "./client";

type DoceboConfig = {
  instance_url?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class DoceboAuth implements IntegrationServiceAccountAuth {
  async authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as DoceboConfig;

    const instanceUrl = config.instance_url;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (!(instanceUrl && clientId && clientSecret)) {
      throw new Error(
        "Docebo credentials not configured: instance_url, client_id, and client_secret are required"
      );
    }

    try {
      const tokens = await exchangeDoceboCredentials({
        instanceUrl,
        clientId,
        clientSecret,
      });

      const client = createDoceboClient({
        connectorId,
        accessToken: tokens.accessToken,
        instanceUrl: tokens.instanceUrl,
      });

      const healthy = await client.healthCheck();
      if (!healthy) {
        throw new Error(
          "Failed to validate Docebo credentials - health check failed"
        );
      }

      const instanceName = new URL(tokens.instanceUrl).hostname.split(".")[0];

      const updated = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const result = await activateConnector(tx, connectorId, {
          workspaceExternalId: instanceName ?? connectorId,
          name: `Docebo (${instanceName})`,
          config: {
            ...(current.config as object),
            instanceUrl: tokens.instanceUrl,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: result.id,
          app: AppType.DOCEBO,
          accessToken: tokens.accessToken,
          refreshToken: "",
          expiresIn: tokens.expiresIn,
          scopes: ["api"],
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
