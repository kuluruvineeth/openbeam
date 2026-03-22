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
  exchangeMondayCode,
  generateMondayAuthUrl,
  mondayApp,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { z } from "zod";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

const MondayConfigSchema = z
  .object({
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  })
  .passthrough();

export class MondayAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      mondayApp.auth.type === AuthType.OAUTH2
        ? mondayApp.auth.config.redirectPath
        : "/connectors/setup/monday/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const parsed = MondayConfigSchema.safeParse(connector.config);
    if (!parsed.success) {
      throw new Error("Invalid connector configuration");
    }

    const { client_id, client_secret } = parsed.data;
    if (!client_id) {
      throw new Error("Monday OAuth client_id not configured");
    }
    if (!client_secret) {
      throw new Error("Monday OAuth client_secret not configured");
    }

    return { clientId: client_id, clientSecret: client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateMondayAuthUrl({
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

      const tokens = await exchangeMondayCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: String(tokens.accountId),
          name: `Monday.com (${tokens.accountName})`,
          config: {
            ...(current.config as object),
            accountId: tokens.accountId,
            accountName: tokens.accountName,
            accountSlug: tokens.accountSlug,
            userId: tokens.userId,
            userEmail: tokens.userEmail,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.MONDAY,
          accessToken: tokens.accessToken,
          scopes: [
            "boards:read",
            "workspaces:read",
            "users:read",
            "updates:read",
            "account:read",
            "me:read",
          ],
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
