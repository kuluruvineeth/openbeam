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
  bynderApp,
  exchangeBynderCode,
  generateBynderAuthUrl,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type BynderConfig = {
  client_id?: string;
  client_secret?: string;
  domain?: string;
  [key: string]: unknown;
};

export class BynderAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      bynderApp.auth.type === AuthType.OAUTH2
        ? bynderApp.auth.config.redirectPath
        : "/connectors/setup/bynder/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as BynderConfig;

    if (!(config.client_id && config.client_secret && config.domain)) {
      throw new Error("Bynder OAuth credentials or domain not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      domain: config.domain,
    };
  }

  private getOAuthConfig() {
    if (bynderApp.auth.type !== AuthType.OAUTH2) {
      throw new Error("Bynder app is not configured for OAuth2");
    }
    return bynderApp.auth.config;
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId, domain } = await this.getCredentials(ctx.connectorId);

    return generateBynderAuthUrl({
      config: this.getOAuthConfig(),
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
      domain,
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret, domain } =
        await this.getCredentials(connectorId);

      const tokens = await exchangeBynderCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
        domain,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: domain,
          name: tokens.userEmail ? `Bynder (${tokens.userEmail})` : "Bynder",
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            userId: tokens.userId,
            displayName: tokens.displayName,
            domain,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.BYNDER,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          scopes: ["offline", "asset:read", "collection:read"],
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
