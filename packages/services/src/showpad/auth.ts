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
  exchangeShowpadCode,
  generateShowpadAuthUrl,
  showpadApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type ShowpadConfig = {
  client_id?: string;
  client_secret?: string;
  subdomain?: string;
  [key: string]: unknown;
};

export class ShowpadAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      showpadApp.auth.type === AuthType.OAUTH2
        ? showpadApp.auth.config.redirectPath
        : "/connectors/setup/showpad/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as ShowpadConfig;

    if (!(config.client_id && config.client_secret && config.subdomain)) {
      throw new Error("Showpad OAuth credentials or subdomain not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      subdomain: config.subdomain,
    };
  }

  private getOAuthConfig() {
    if (showpadApp.auth.type !== AuthType.OAUTH2) {
      throw new Error("Showpad app is not configured for OAuth2");
    }
    return showpadApp.auth.config;
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId, subdomain } = await this.getCredentials(ctx.connectorId);

    return generateShowpadAuthUrl({
      config: this.getOAuthConfig(),
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
      subdomain,
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret, subdomain } =
        await this.getCredentials(connectorId);

      const tokens = await exchangeShowpadCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
        subdomain,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: subdomain,
          name: tokens.userEmail ? `Showpad (${tokens.userEmail})` : "Showpad",
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            userId: tokens.userId,
            displayName: tokens.displayName,
            subdomain,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.SHOWPAD,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          scopes: [],
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
