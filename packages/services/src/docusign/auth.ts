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
  docuSignApp,
  exchangeDocuSignCode,
  generateDocuSignAuthUrl,
} from "@openbeam/integrations";
import type { DocuSignEnvironment } from "@openbeam/integrations/docusign/oauth";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type DocuSignConfig = {
  client_id?: string;
  client_secret?: string;
  environment?: string;
  [key: string]: unknown;
};

export class DocuSignAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      docuSignApp.auth.type === AuthType.OAUTH2
        ? docuSignApp.auth.config.redirectPath
        : "/connectors/setup/docusign/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as DocuSignConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("DocuSign OAuth credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      environment: (config.environment as DocuSignEnvironment) ?? "production",
    };
  }

  private getOAuthConfig() {
    if (docuSignApp.auth.type !== AuthType.OAUTH2) {
      throw new Error("DocuSign app is not configured for OAuth2");
    }
    return docuSignApp.auth.config;
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId, environment } = await this.getCredentials(
      ctx.connectorId
    );

    return generateDocuSignAuthUrl({
      config: this.getOAuthConfig(),
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
      environment,
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret, environment } =
        await this.getCredentials(connectorId);

      const tokens = await exchangeDocuSignCode({
        config: this.getOAuthConfig(),
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
        environment,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.accountId,
          name: tokens.userEmail
            ? `DocuSign (${tokens.userEmail})`
            : `DocuSign (${tokens.accountName})`,
          config: {
            ...(current.config as object),
            accountId: tokens.accountId,
            accountName: tokens.accountName,
            baseUri: tokens.baseUri,
            userId: tokens.userId,
            userEmail: tokens.userEmail,
            userName: tokens.userName,
            environment,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.DOCUSIGN,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["signature", "extended"],
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
