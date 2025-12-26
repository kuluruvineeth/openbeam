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
  exchangeLinearCode,
  generateLinearAuthUrl,
  linearApp,
} from "@openplane/integrations";
import { z } from "zod";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "../types";

const LinearConfigSchema = z
  .object({
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  })
  .passthrough();

export class LinearAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      linearApp.auth.type === AuthType.OAUTH2
        ? linearApp.auth.config.redirectPath
        : "/connectors/setup/linear/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const parsed = LinearConfigSchema.safeParse(connector.config);
    if (!parsed.success) {
      throw new Error("Invalid connector configuration");
    }

    const { client_id, client_secret } = parsed.data;
    if (!client_id) {
      throw new Error("Linear OAuth client_id not configured");
    }
    if (!client_secret) {
      throw new Error("Linear OAuth client_secret not configured");
    }

    return { clientId: client_id, clientSecret: client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateLinearAuthUrl({
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

      const tokens = await exchangeLinearCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.organizationId,
          name: `Linear (${tokens.organizationName})`,
          config: {
            ...(current.config as object),
            organizationId: tokens.organizationId,
            organizationName: tokens.organizationName,
            urlKey: tokens.urlKey,
            userId: tokens.userId,
            userEmail: tokens.userEmail,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.LINEAR,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: ["read", "write"],
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
