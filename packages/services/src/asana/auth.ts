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
  type AsanaWorkspace,
  AuthType,
  asanaApp,
  exchangeAsanaCode,
  generateAsanaAuthUrl,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type AsanaConfig = {
  client_id?: string;
  client_secret?: string;
  workspace_gid?: string;
  [key: string]: unknown;
};

export class AsanaAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      asanaApp.auth.type === AuthType.OAUTH2
        ? asanaApp.auth.config.redirectPath
        : "/connectors/setup/asana/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as AsanaConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Asana OAuth credentials not configured");
    }

    return { clientId: config.client_id, clientSecret: config.client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateAsanaAuthUrl({
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

      const tokens = await exchangeAsanaCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const primaryWorkspace = tokens.workspaces[0];

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);
        const currentConfig = current.config as AsanaConfig;

        const workspaceGid =
          currentConfig.workspace_gid || primaryWorkspace?.gid || "";
        const workspaceName =
          tokens.workspaces.find(
            (ws: AsanaWorkspace) => ws.gid === workspaceGid
          )?.name ??
          primaryWorkspace?.name ??
          "Asana";

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: workspaceGid,
          name: `${workspaceName} (${tokens.userEmail})`,
          config: {
            ...(current.config as object),
            userEmail: tokens.userEmail,
            userGid: tokens.userGid,
            userName: tokens.userName,
            workspace_gid: workspaceGid,
            workspaceName,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.ASANA,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["default"],
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
