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
  exchangeWorkdayCode,
  generateWorkdayAuthUrl,
  workdayApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type WorkdayConfig = {
  client_id?: string;
  client_secret?: string;
  tenant?: string;
  host?: string;
  [key: string]: unknown;
};

export class WorkdayAuth implements IntegrationAuth {
  #getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      workdayApp.auth.type === AuthType.OAUTH2
        ? workdayApp.auth.config.redirectPath
        : "/connectors/setup/workday/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  async #getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as WorkdayConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Workday OAuth credentials not configured");
    }

    if (!(config.tenant && config.host)) {
      throw new Error("Workday tenant and host are required");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      tenant: config.tenant,
      host: config.host,
    };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId, tenant, host } = await this.#getCredentials(
      ctx.connectorId
    );

    return generateWorkdayAuthUrl({
      clientId,
      redirectUri: this.#getRedirectUri(),
      host,
      tenant,
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
      const { clientId, clientSecret, tenant, host } =
        await this.#getCredentials(connectorId);

      const tokens = await exchangeWorkdayCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.#getRedirectUri(),
        tenant,
        host,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const displayName = `Workday (${tenant})`;

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tenant,
          name: displayName,
          config: {
            ...(current.config as object),
            tenant,
            host,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.WORKDAY,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["r:workers", "r:organizations"],
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
