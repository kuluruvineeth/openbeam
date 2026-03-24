import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import { exchangeCoupaCredentials } from "@openbeam/integrations";
import type {
  ConnectorResult,
  IntegrationServiceAccountAuth,
  ServiceAccountAuthContext,
} from "@openbeam/types/services";
import { createCoupaClient } from "./client";

type CoupaConfig = {
  instance_url?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class CoupaAuth implements IntegrationServiceAccountAuth {
  async authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as CoupaConfig;

    const instanceUrl = config.instance_url;
    const clientId = config.client_id;
    const clientSecret = config.client_secret;

    if (!(instanceUrl && clientId && clientSecret)) {
      throw new Error(
        "Coupa credentials not configured: instance_url, client_id, and client_secret are required"
      );
    }

    try {
      const tokens = await exchangeCoupaCredentials({
        instanceUrl,
        clientId,
        clientSecret,
      });

      const client = createCoupaClient({
        connectorId,
        accessToken: tokens.accessToken,
        instanceUrl: tokens.instanceUrl,
      });

      const healthy = await client.healthCheck();
      if (!healthy) {
        throw new Error(
          "Failed to validate Coupa credentials - health check failed"
        );
      }

      const instanceName = new URL(tokens.instanceUrl).hostname.split(".")[0];

      const updated = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const result = await activateConnector(tx, connectorId, {
          workspaceExternalId: instanceName ?? connectorId,
          name: `Coupa (${instanceName})`,
          config: {
            ...(current.config as object),
            instanceUrl: tokens.instanceUrl,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: result.id,
          app: AppType.COUPA,
          accessToken: tokens.accessToken,
          refreshToken: "",
          expiresIn: tokens.expiresIn,
          scopes: ["core.read"],
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
