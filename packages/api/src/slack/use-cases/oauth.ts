import prisma, {
  AppType,
  ConnectorStatus,
  getConnectorWithCredentials,
} from "@openplane/db";
import {
  AuthType,
  exchangeSlackCode,
  generateSlackAuthUrl,
  slackApp,
} from "@openplane/integrations";
import jwt from "jsonwebtoken";
import type {
  ConnectorResult,
  IntegrationAuth,
} from "../../integrations/types";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const TOKEN_EXPIRY = "1h";

interface OAuthState {
  userId: string;
  workspaceId: string;
  redirectUrl?: string;
  connectorId: string;
  timestamp: number;
}

interface ConnectorConfig {
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
}

export class SlackAuth implements IntegrationAuth {
  private getOAuthRedirectUri(): string {
    const baseUrl = process.env.CORS_ORIGIN || "http://localhost:3001";
    const redirectPath =
      slackApp.auth.type === AuthType.OAUTH2
        ? slackApp.auth.config.redirectPath ||
          "/integrations/slack/oauth/callback"
        : "/integrations/slack/oauth/callback";
    return `${baseUrl}${redirectPath}`;
  }

  private async getClientId(connectorId: string): Promise<string> {
    const connector = await getConnectorWithCredentials(prisma, connectorId);

    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as ConnectorConfig;
    const clientId = config.client_id;

    if (!clientId || typeof clientId !== "string") {
      throw new Error("Slack Client ID not configured in connector settings");
    }

    return clientId;
  }

  private async getClientCredentials(
    connectorId: string
  ): Promise<{ clientId: string; clientSecret: string }> {
    const connector = await getConnectorWithCredentials(prisma, connectorId);

    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as ConnectorConfig;
    const { client_id: clientId, client_secret: clientSecret } = config;

    if (clientId === undefined || clientSecret === undefined) {
      throw new Error("Slack credentials not configured in connector");
    }

    return { clientId, clientSecret };
  }

  private createOAuthState(ctx: {
    userId: string;
    workspaceId: string;
    redirectUrl?: string;
    connectorId: string;
  }): string {
    const statePayload: OAuthState = {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      redirectUrl: ctx.redirectUrl,
      connectorId: ctx.connectorId,
      timestamp: Date.now(),
    };

    return jwt.sign(statePayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  private verifyOAuthState(state: string): OAuthState {
    try {
      return jwt.verify(state, JWT_SECRET) as OAuthState;
    } catch {
      throw new Error("Invalid or expired OAuth state");
    }
  }

  async start(ctx: {
    user: { id: string };
    workspaceId: string;
    redirectUrl?: string;
    connectorId?: string;
  }): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error(
        "Connector ID required. Please configure Slack settings first"
      );
    }

    const clientId = await this.getClientId(ctx.connectorId);
    const state = this.createOAuthState({
      userId: ctx.user.id,
      workspaceId: ctx.workspaceId,
      redirectUrl: ctx.redirectUrl,
      connectorId: ctx.connectorId,
    });

    return generateSlackAuthUrl({
      clientId,
      redirectUri: this.getOAuthRedirectUri(),
      state,
    });
  }

  async complete(ctx: {
    code: string;
    state: string;
  }): Promise<ConnectorResult> {
    const { redirectUrl, connectorId } = this.verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: Connector ID missing");
    }

    try {
      const { clientId, clientSecret } =
        await this.getClientCredentials(connectorId);

      const tokenResult = await exchangeSlackCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getOAuthRedirectUri(),
      });

      const updatedConnector = await prisma.$transaction(async (tx) => {
        const currentConnector = await tx.connector.findUniqueOrThrow({
          where: { id: connectorId },
        });

        const currentConfig =
          (currentConnector.config as ConnectorConfig) || {};

        const connector = await tx.connector.update({
          where: { id: connectorId },
          data: {
            status: ConnectorStatus.ACTIVE,
            lastSyncedAt: null, // Syncing hasn't started yet
            workspaceExternalId: tokenResult.teamId,
            name: tokenResult.teamName,
            config: {
              ...currentConfig,
              botUserId: tokenResult.botUserId,
              teamId: tokenResult.teamId,
            },
          },
        });

        await tx.oAuthProvider.upsert({
          where: { connectorId: connector.id },
          update: {
            accessToken: tokenResult.accessToken, // TODO: Add encryption layer
            refreshToken: tokenResult.refreshToken, // Store refresh token for future token refresh
            oauthScopes: tokenResult.scopes,
            updatedAt: new Date(),
          },
          create: {
            connectorId: connector.id,
            accessToken: tokenResult.accessToken, // TODO: Add encryption layer
            refreshToken: tokenResult.refreshToken, // Store refresh token for future token refresh
            oauthScopes: tokenResult.scopes,
            app: AppType.SLACK,
          },
        });

        return connector;
      });

      return {
        connector: updatedConnector,
        redirectUrl,
      };
    } catch (error) {
      // OAuth failed - clean up the connector
      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          status: ConnectorStatus.ERROR,
          lastError: error instanceof Error ? error.message : "OAuth failed",
          lastErrorAt: new Date(),
        },
      });

      throw error;
    }
  }
}
