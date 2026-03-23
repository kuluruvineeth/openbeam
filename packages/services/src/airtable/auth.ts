import crypto from "node:crypto";
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
  airtableApp,
  exchangeAirtableCode,
  generateAirtableAuthUrl,
} from "@openbeam/integrations";
import type {
  AuthCompleteContext,
  AuthStartContext,
  ConnectorResult,
  IntegrationAuth,
} from "@openbeam/types/services";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";

type AirtableConfig = {
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
  [key: string]: unknown;
};

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export class AirtableAuth implements IntegrationAuth {
  private getRedirectUri(): string {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    const redirectPath =
      airtableApp.auth.type === AuthType.OAUTH2
        ? airtableApp.auth.config.redirectPath
        : "/connectors/setup/airtable/oauth/callback";
    return `${webUrl}${redirectPath}`;
  }

  private async getCredentials(connectorId: string) {
    const connector = await getConnectorWithCredentials(prisma, connectorId);
    if (!connector?.config) {
      throw new Error("Connector configuration not found");
    }

    const config = connector.config as AirtableConfig;

    if (!(config.client_id && config.client_secret)) {
      throw new Error("Airtable OAuth credentials not configured");
    }

    return {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      codeVerifier: config.code_verifier,
    };
  }

  private getOAuthConfig() {
    if (airtableApp.auth.type !== AuthType.OAUTH2) {
      throw new Error("Airtable app is not configured for OAuth2");
    }
    return airtableApp.auth.config;
  }

  async start(ctx: AuthStartContext): Promise<string> {
    if (!ctx.connectorId) {
      throw new Error("Connector ID required");
    }

    const { clientId } = await this.getCredentials(ctx.connectorId);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const connector = await getConnectorById(prisma, ctx.connectorId);
    const currentConfig = (connector.config as Record<string, unknown>) ?? {};
    await prisma.connector.update({
      where: { id: ctx.connectorId },
      data: {
        config: { ...currentConfig, code_verifier: codeVerifier },
      },
    });

    return generateAirtableAuthUrl({
      config: this.getOAuthConfig(),
      clientId,
      redirectUri: this.getRedirectUri(),
      state: createOAuthState({
        userId: ctx.user.id,
        workspaceId: ctx.workspaceId,
        connectorId: ctx.connectorId,
        redirectUrl: ctx.redirectUrl,
      }),
      codeChallenge,
    });
  }

  async complete(ctx: AuthCompleteContext): Promise<ConnectorResult> {
    const { connectorId, redirectUrl } = verifyOAuthState(ctx.state);

    if (!connectorId) {
      throw new Error("Invalid state: missing connector ID");
    }

    try {
      const { clientId, clientSecret, codeVerifier } =
        await this.getCredentials(connectorId);

      if (!codeVerifier) {
        throw new Error("PKCE code verifier not found — restart OAuth flow");
      }

      const tokens = await exchangeAirtableCode({
        config: this.getOAuthConfig(),
        clientId,
        clientSecret,
        code: ctx.code,
        redirectUri: this.getRedirectUri(),
        codeVerifier,
      });

      const connector = await prisma.$transaction(async (tx) => {
        const current = await getConnectorById(tx, connectorId);
        const currentConfig = (current.config as Record<string, unknown>) ?? {};
        const { code_verifier: _removed, ...cleanConfig } = currentConfig;

        const updated = await activateConnector(tx, connectorId, {
          workspaceExternalId: tokens.userId,
          name: tokens.userEmail
            ? `Airtable (${tokens.userEmail})`
            : `Airtable (${tokens.userId})`,
          config: {
            ...cleanConfig,
            userId: tokens.userId,
            userEmail: tokens.userEmail,
          },
        });

        await upsertOAuthProvider(tx, {
          connectorId: updated.id,
          app: AppType.AIRTABLE,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          scopes: [
            "data.records:read",
            "data.recordComments:read",
            "schema.bases:read",
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
