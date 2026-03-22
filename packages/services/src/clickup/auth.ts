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
  clickUpApp,
  exchangeClickUpCode,
  generateClickUpAuthUrl,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { z } from "zod";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

const ClickUpConfigSchema = z
  .object({
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  })
  .passthrough();

export class ClickUpAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      clickUpApp.auth.type === AuthType.OAUTH2
        ? clickUpApp.auth.config.redirectPath
        : "/connectors/setup/clickup/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const parsed = ClickUpConfigSchema.safeParse(connector.config);
    if (!parsed.success) {
      throw new Error("Invalid connector configuration");
    }

    const { client_id, client_secret } = parsed.data;
    if (!client_id) {
      throw new Error("ClickUp OAuth client_id not configured");
    }
    if (!client_secret) {
      throw new Error("ClickUp OAuth client_secret not configured");
    }

    return { clientId: client_id, clientSecret: client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateClickUpAuthUrl({
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

      const result = await exchangeClickUpCode({
        clientId,
        clientSecret,
        code: ctx.code,
      });

      const primaryWorkspace = result.workspaces[0];
      if (!primaryWorkspace) {
        throw new Error("No ClickUp workspaces found for this account");
      }

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: primaryWorkspace.id,
          name: `ClickUp (${primaryWorkspace.name})`,
          config: {
            ...(current.config as object),
            workspace_id: primaryWorkspace.id,
            workspaceName: primaryWorkspace.name,
            userId: result.userId,
            userEmail: result.userEmail,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.CLICKUP,
          accessToken: result.accessToken,
          expiresIn: 365 * 24 * 60 * 60,
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
