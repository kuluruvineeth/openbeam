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
  exchangeSlackCode,
  generateSlackAuthUrl,
  slackApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type SlackConfig = {
  client_id?: string;
  client_secret?: string;
  signing_secret?: string;
  [key: string]: unknown;
};

export class SlackAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      slackApp.auth.type === AuthType.OAUTH2
        ? slackApp.auth.config.redirectPath
        : "/connectors/setup/slack/oauth/callback";
    return `${webUrl}${redirectPath}`;
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

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.teamId,
          name: tokens.teamName,
          config: {
            ...(current.config as object),
            botUserId: tokens.botUserId,
            teamId: tokens.teamId,
            ...(signingSecret && { signing_secret: signingSecret }),
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.SLACK,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          scopes: tokens.scopes,
          clientId,
          clientSecret,
          syncAccessToken: tokens.syncAccessToken,
          syncTokenScopes: tokens.syncScopes ?? [],
          syncAuthedUserId: tokens.syncAuthedUserId ?? null,
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
