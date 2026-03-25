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
  exchangePanoptoCode,
  generatePanoptoAuthUrl,
  panoptoApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type PanoptoConfig = {
  client_id?: string;
  client_secret?: string;
  instance_url?: string;
  [key: string]: unknown;
};

export class PanoptoAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      panoptoApp.auth.type === AuthType.OAUTH2
        ? panoptoApp.auth.config.redirectPath
        : "/connectors/setup/panopto/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as PanoptoConfig;

    if (!(config.client_id && config.client_secret && config.instance_url)) {
      throw new Error("Panopto OAuth credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      instanceUrl: normalizeInstanceUrl(config.instance_url),
    };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId, instanceUrl } = await this.getCredentials(
      ctx.connectorId
    );

    return generatePanoptoAuthUrl({
      config:
        panoptoApp.auth.type === AuthType.OAUTH2
          ? panoptoApp.auth.config
          : { authUrl: "", tokenUrl: "", redirectPath: "", scopes: [] },
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
      instanceUrl,
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret, instanceUrl } =
        await this.getCredentials(connectorId);

      const tokens = await exchangePanoptoCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
        instanceUrl,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.userId,
          name: tokens.userEmail
            ? `Panopto (${tokens.userEmail})`
            : `Panopto (${tokens.displayName})`,
          config: {
            ...(current.config as object),
            instanceUrl,
            userEmail: tokens.userEmail,
            userName: tokens.displayName,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.PANOPTO,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["api", "openid"],
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

function normalizeInstanceUrl(url: string): string {
  let normalized = url.trim();
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (
    !(normalized.startsWith("https://") || normalized.startsWith("http://"))
  ) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}
