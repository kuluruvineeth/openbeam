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
  exchangeServiceNowCode,
  generateServiceNowAuthUrl,
  servicenowApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type ServiceNowConfig = {
  instance?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class ServiceNowAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      servicenowApp.auth.type === AuthType.OAUTH2
        ? servicenowApp.auth.config.redirectPath
        : "/connectors/setup/servicenow/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as ServiceNowConfig;

    if (!config.instance) {
      throw new Error("ServiceNow instance name not configured");
    }

    if (!(config.client_id && config.client_secret)) {
      throw new Error("ServiceNow OAuth credentials not configured");
    }

    return {
      instance: config.instance,
      clientId: config.client_id,
      clientSecret: config.client_secret,
    };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { instance, clientId } = await this.getCredentials(ctx.connectorId);

    return generateServiceNowAuthUrl({
      instance,
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
      const { instance, clientId, clientSecret } =
        await this.getCredentials(connectorId);

      const tokens = await exchangeServiceNowCode({
        instance,
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const displayName = tokens.userEmail
          ? `ServiceNow (${tokens.userEmail})`
          : "ServiceNow";

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.userId,
          name: displayName,
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            instance,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.SERVICENOW,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["useraccount"],
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
