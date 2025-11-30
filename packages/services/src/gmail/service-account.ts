import prisma, {
  AppType,
  ConnectorStatus,
  createDefaultSyncJobs,
  encryptIfConfigured,
  getConnectorWithCredentials,
} from "@openplane/db";
import {
  getServiceAccountToken,
  parseServiceAccountCredentials,
} from "@openplane/integrations";
import type { ConnectorResult, IntegrationServiceAccountAuth } from "../types";

type ConnectorConfig = {
  service_account_file?: string;
  service_account_json?: string;
  sa_input_method?: "file" | "paste";
  delegated_email?: string;
  [key: string]: unknown;
};

export class GmailServiceAccountAuth implements IntegrationServiceAccountAuth {
  private getCredentialsJson(config: ConnectorConfig): string {
    if (config.sa_input_method === "file" && config.service_account_file) {
      return config.service_account_file;
    }

    if (config.sa_input_method === "paste" && config.service_account_json) {
      return config.service_account_json;
    }

    throw new Error("Service account credentials not configured");
  }

  async authenticate(ctx: {
    user: { id: string };
    workspaceId: string;
    connectorId: string;
    credentials?: string;
    delegatedEmail?: string;
  }): Promise<ConnectorResult> {
    const { connectorId } = ctx;

    try {
      const existingConnector = await getConnectorWithCredentials(
        prisma,
        connectorId
      );

      if (!existingConnector?.config) {
        throw new Error("Connector configuration not found");
      }

      const config = existingConnector.config as ConnectorConfig;
      const credentialsJson =
        ctx.credentials || this.getCredentialsJson(config);
      const delegatedEmail = ctx.delegatedEmail || config.delegated_email;

      if (!delegatedEmail) {
        throw new Error("Delegated admin email required");
      }

      const credentials = parseServiceAccountCredentials(credentialsJson);
      const tokenResult = await getServiceAccountToken({
        credentials,
        delegatedUserEmail: delegatedEmail,
      });

      const encryptedCredentials = encryptIfConfigured(credentialsJson);
      const accessTokenEncrypted = encryptIfConfigured(tokenResult.accessToken);
      const tokenExpiresAt = new Date(
        Date.now() + tokenResult.expiresIn * 1000
      );

      const connector = await prisma.$transaction(async (tx) => {
        const currentConfig =
          (existingConnector.config as ConnectorConfig) || {};

        const updated = await tx.connector.update({
          where: { id: connectorId },
          data: {
            status: ConnectorStatus.ACTIVE,
            statusChangedAt: new Date(),
            lastSyncedAt: null,
            workspaceExternalId: tokenResult.projectId,
            name: `Gmail (${delegatedEmail})`,
            encryptedCredentials: encryptedCredentials.encrypted,
            credentialsIv: encryptedCredentials.iv,
            config: {
              ...currentConfig,
              serviceAccountEmail: tokenResult.serviceAccountEmail,
              delegatedEmail: tokenResult.delegatedUserEmail,
              projectId: tokenResult.projectId,
              service_account_file: undefined,
              service_account_json: undefined,
            },
          },
        });

        await tx.oAuthProvider.upsert({
          where: { connectorId: updated.id },
          create: {
            connectorId: updated.id,
            app: AppType.GMAIL,
            accessToken: accessTokenEncrypted.encrypted,
            accessTokenIv: accessTokenEncrypted.iv,
            refreshToken: null,
            refreshTokenIv: null,
            tokenExpiresAt,
            tokenRefreshedAt: new Date(),
            oauthScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            tokenScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            tokenType: "Bearer",
          },
          update: {
            accessToken: accessTokenEncrypted.encrypted,
            accessTokenIv: accessTokenEncrypted.iv,
            refreshToken: null,
            refreshTokenIv: null,
            tokenExpiresAt,
            tokenRefreshedAt: new Date(),
            oauthScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            tokenScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            tokenType: "Bearer",
            updatedAt: new Date(),
          },
        });

        await createDefaultSyncJobs(tx, updated.id);

        return updated;
      });

      return { connector };
    } catch (error) {
      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          status: ConnectorStatus.ERROR,
          statusChangedAt: new Date(),
          lastError:
            error instanceof Error
              ? error.message
              : "Service account auth failed",
          lastErrorAt: new Date(),
        },
      });

      throw error;
    }
  }
}
