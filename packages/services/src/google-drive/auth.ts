import prisma, {
  AppType,
  activateConnector,
  createDefaultSyncJobs,
  getConnectorById,
  getConnectorWithCredentials,
  setConnectorError,
  upsertOAuthProvider,
} from "@openplane/db";
import {
  AuthType,
  exchangeGoogleDriveCode,
  generateGoogleDriveAuthUrl,
  googleDriveApp,
  parseOAuthCredentialsFile,
} from "@openplane/integrations";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "../types";

type GoogleDriveConfig = {
  client_id?: string;
  client_secret?: string;
  oauth_credentials_file?: string;
  oauth_input_method?: "file" | "manual";
  [key: string]: unknown;
};

export class GoogleDriveAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      googleDriveApp.auth.type === AuthType.OAUTH2
        ? googleDriveApp.auth.config.redirectPath
        : "/connectors/setup/google-drive/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as GoogleDriveConfig;

    if (config.oauth_input_method === "file" && config.oauth_credentials_file) {
      const parsed = parseOAuthCredentialsFile(config.oauth_credentials_file);
      return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
    }

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Google Drive OAuth credentials not configured");
    }

    return { clientId: config.client_id, clientSecret: config.client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateGoogleDriveAuthUrl({
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

      const tokens = await exchangeGoogleDriveCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.userId,
          name: `Google Drive (${tokens.userEmail})`,
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            domain: tokens.hostedDomain,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.GOOGLE_DRIVE,
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
