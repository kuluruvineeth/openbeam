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
  exchangeGitHubCode,
  generateGitHubAuthUrl,
  githubApp,
} from "@openplane/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openplane/types/services";
import { z } from "zod";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

const GitHubConfigSchema = z
  .object({
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
  })
  .passthrough();

export class GitHubAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      githubApp.auth.type === AuthType.OAUTH2
        ? githubApp.auth.config.redirectPath
        : "/connectors/setup/github/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const parsed = GitHubConfigSchema.safeParse(connector.config);
    if (!parsed.success) {
      throw new Error("Invalid connector configuration");
    }

    const { client_id, client_secret } = parsed.data;

    if (!client_id) {
      throw new Error("GitHub OAuth client_id not configured");
    }

    if (!client_secret) {
      throw new Error("GitHub OAuth client_secret not configured");
    }

    return { clientId: client_id, clientSecret: client_secret };
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);

    return generateGitHubAuthUrl({
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

      const tokens = await exchangeGitHubCode({
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);

        const connectorConfig: Record<string, unknown> = {
          ...(current.config as object),
          userLogin: tokens.userLogin,
          profileUrl: tokens.profileUrl,
          accountType: tokens.accountType,
        };

        if (tokens.userName) {
          connectorConfig.userName = tokens.userName;
        }

        if (tokens.userEmail) {
          connectorConfig.userEmail = tokens.userEmail;
        }

        if (tokens.avatarUrl) {
          connectorConfig.avatarUrl = tokens.avatarUrl;
        }

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.userId,
          name: tokens.userName ?? tokens.userLogin,
          config: connectorConfig,
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.GITHUB,
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
