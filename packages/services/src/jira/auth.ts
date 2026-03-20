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
  exchangeJiraCode,
  generateJiraAuthUrl,
  jiraApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type JiraConfig = {
  client_id?: string;
  client_secret?: string;
  cloudId?: string;
  siteUrl?: string;
  siteName?: string;
  [key: string]: unknown;
};

export class JiraAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      jiraApp.auth.type === AuthType.OAUTH2
        ? jiraApp.auth.config.redirectPath
        : "/connectors/setup/jira/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as JiraConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Jira OAuth credentials not configured");
    }

    return { clientId: config.client_id, clientSecret: config.client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateJiraAuthUrl({
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

      const tokens = await exchangeJiraCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.cloudId,
          name: `${tokens.siteName} (${tokens.userEmail})`,
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            cloudId: tokens.cloudId,
            siteUrl: tokens.siteUrl,
            siteName: tokens.siteName,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.JIRA,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: tokens.scopes,
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
