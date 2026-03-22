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
  exchangeIntercomCode,
  generateIntercomAuthUrl,
  intercomApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type IntercomConfig = {
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
};

export class IntercomAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      intercomApp.auth.type === AuthType.OAUTH2
        ? intercomApp.auth.config.redirectPath
        : "/connectors/setup/intercom/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as IntercomConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Intercom OAuth credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
    };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateIntercomAuthUrl({
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

      const tokens = await exchangeIntercomCode({
        clientId,
        clientSecret,
        code: ctx.code,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        let displayName = "Intercom";
        if (tokens.workspaceName) {
          displayName = `Intercom (${tokens.workspaceName})`;
        } else if (tokens.adminEmail) {
          displayName = `Intercom (${tokens.adminEmail})`;
        }

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.appId ?? tokens.adminId,
          name: displayName,
          config: {
            ...(current.config as object),
            adminEmail: tokens.adminEmail,
            adminId: tokens.adminId,
            appId: tokens.appId,
            workspaceName: tokens.workspaceName,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.INTERCOM,
          accessToken: tokens.accessToken,
          refreshToken: "",
          expiresIn: 0,
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
