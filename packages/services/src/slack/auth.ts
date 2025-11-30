import prisma, {
  AppType,
  ConnectorStatus,
  createDefaultSyncJobs,
  encryptIfConfigured,
  getConnectorWithCredentials,
} from "@openplane/db";
import {
  AuthType,
  exchangeSlackCode,
  generateSlackAuthUrl,
  slackApp,
} from "@openplane/integrations";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "../types";

type SlackConfig = {
  client_id?: string;
  client_secret?: string;
  signing_secret?: string;
  [key: string]: unknown;
};

export class SlackAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const baseUrl = process.env.CORS_ORIGIN || "http://localhost:3001";
    const redirectPath =
      slackApp.auth.type === AuthType.OAUTH2
        ? slackApp.auth.config.redirectPath
        : "/connectors/setup/slack/oauth/callback";
    return `${baseUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as SlackConfig;
    if (!(config.client_id && config.client_secret)) {
      throw new Error("Slack credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      signingSecret: config.signing_secret,
    };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateSlackAuthUrl({
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
      const { clientId, clientSecret, signingSecret } =
        await this.getCredentials(connectorId);

      const tokens = await exchangeSlackCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      // Encrypt sensitive credentials
      const accessTokenEncrypted = encryptIfConfigured(tokens.accessToken);
      const refreshTokenEncrypted = encryptIfConfigured(tokens.refreshToken);
      const clientSecretEncrypted = encryptIfConfigured(clientSecret);

      const connector = await prisma.$transaction(async (tx) => {
        const current = await tx.connector.findUniqueOrThrow({
          where: { id: connectorId },
        });

        const updated = await tx.connector.update({
          where: { id: connectorId },
          data: {
            status: ConnectorStatus.ACTIVE,
            statusChangedAt: new Date(),
            lastSyncedAt: null,
            workspaceExternalId: tokens.teamId,
            name: tokens.teamName,
            config: {
              ...(current.config as object),
              botUserId: tokens.botUserId,
              teamId: tokens.teamId,
              ...(signingSecret && { signing_secret: signingSecret }),
            },
          },
        });

        await tx.oAuthProvider.upsert({
          where: { connectorId: updated.id },
          create: {
            connectorId: updated.id,
            app: AppType.SLACK,
            accessToken: accessTokenEncrypted.encrypted,
            accessTokenIv: accessTokenEncrypted.iv,
            refreshToken: refreshTokenEncrypted.encrypted,
            refreshTokenIv: refreshTokenEncrypted.iv,
            oauthScopes: tokens.scopes,
            tokenScopes: tokens.scopes,
            tokenType: "Bearer",
            tokenRefreshedAt: new Date(),
            clientId,
            clientSecret: clientSecretEncrypted.encrypted,
            clientSecretIv: clientSecretEncrypted.iv,
          },
          update: {
            accessToken: accessTokenEncrypted.encrypted,
            accessTokenIv: accessTokenEncrypted.iv,
            refreshToken: refreshTokenEncrypted.encrypted,
            refreshTokenIv: refreshTokenEncrypted.iv,
            oauthScopes: tokens.scopes,
            tokenScopes: tokens.scopes,
            tokenType: "Bearer",
            tokenRefreshedAt: new Date(),
            clientId,
            clientSecret: clientSecretEncrypted.encrypted,
            clientSecretIv: clientSecretEncrypted.iv,
            updatedAt: new Date(),
          },
        });

        await createDefaultSyncJobs(tx, updated.id);
        return updated;
      });

      return { connector, redirectUrl };
    } catch (error) {
      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          status: ConnectorStatus.ERROR,
          statusChangedAt: new Date(),
          lastError: error instanceof Error ? error.message : "OAuth failed",
          lastErrorAt: new Date(),
        },
      });
      throw error;
    }
  }
}
