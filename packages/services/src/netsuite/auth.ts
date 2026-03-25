import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import { validateNetsuiteCredentials } from "@openbeam/integrations";
import type {
  ConnectorResult,
  IntegrationServiceAccountAuth,
  ServiceAccountAuthContext,
} from "@openbeam/types/services";
import { createNetsuiteClient } from "./client";

type NetsuiteConfig = {
  account_id?: string;
  consumer_key?: string;
  consumer_secret?: string;
  token_key?: string;
  token_secret?: string;
  [key: string]: unknown;
};

export class NetsuiteAuth implements IntegrationServiceAccountAuth {
  async authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as NetsuiteConfig;

    const accountId = config.account_id;
    const consumerKey = config.consumer_key;
    const consumerSecret = config.consumer_secret;
    const tokenKey = config.token_key;
    const tokenSecret = config.token_secret;

    if (
      !(accountId && consumerKey && consumerSecret && tokenKey && tokenSecret)
    ) {
      throw new Error(
        "NetSuite credentials not configured: account_id, consumer_key, consumer_secret, token_key, and token_secret are required"
      );
    }

    try {
      const result = await validateNetsuiteCredentials({
        accountId,
        consumerKey,
        consumerSecret,
        tokenKey,
        tokenSecret,
      });

      const client = createNetsuiteClient({
        connectorId,
        accountId,
        consumerKey,
        consumerSecret,
        tokenKey,
        tokenSecret,
      });

      const healthy = await client.healthCheck();
      if (!healthy) {
        throw new Error(
          "Failed to validate NetSuite credentials - health check failed"
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const activated = await activateConnector(tx, connectorId, {
          workspaceExternalId: result.accountId,
          name: `NetSuite (${result.accountName})`,
          config: {
            ...(current.config as object),
            accountId: result.accountId,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: activated.id,
          app: AppType.NETSUITE,
          accessToken: tokenKey,
          refreshToken: "",
          expiresIn: 0,
          scopes: ["restlets", "rest_webservices"],
          clientId: consumerKey,
          clientSecret: consumerSecret,
        });

        await createDefaultSyncJobs(tx, activated.id);
        return activated;
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
