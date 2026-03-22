import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openbeam/db";
import {
  AuthType,
  exchangeHubSpotCode,
  generateHubSpotAuthUrl,
  hubspotApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type HubSpotConfig = {
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class HubSpotAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      hubspotApp.auth.type === AuthType.OAUTH2
        ? hubspotApp.auth.config.redirectPath
        : "/connectors/setup/hubspot/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as HubSpotConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("HubSpot OAuth credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
    };
  }

  private getOAuthConfig() {
    if (hubspotApp.auth.type !== AuthType.OAUTH2) {
      throw new Error("HubSpot app is not configured for OAuth2");
    }
    return hubspotApp.auth.config;
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateHubSpotAuthUrl({
      config: this.getOAuthConfig(),
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret } = await this.getCredentials(connectorId);

      const tokens = await exchangeHubSpotCode({
        config: this.getOAuthConfig(),
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.portalId,
          name: tokens.userEmail
            ? `HubSpot (${tokens.userEmail})`
            : `HubSpot (${tokens.portalId})`,
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            portalId: tokens.portalId,
            hubDomain: tokens.hubDomain,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.HUBSPOT,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: [
            "crm.objects.contacts.read",
            "crm.objects.companies.read",
            "crm.objects.deals.read",
            "tickets",
          ],
          clientId,
          clientSecret,
        });

        await createDefaultSyncJobs(tx, updated.id);
        return updated;
      });

      return { connector, redirectUrl };
    } catch (error) {
      await setConnectorError(
        prisma,
        connectorId,
        error instanceof Error ? error.message : "OAuth failed"
      );
      throw error;
    }
  }
}
