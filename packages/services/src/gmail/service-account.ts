import prisma, {
  AppType,
  ConnectorStatus,
  createDefaultSyncJobs,
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

      const connector = await prisma.$transaction(async (tx) => {
        const currentConfig =
          (existingConnector.config as ConnectorConfig) || {};

        const updated = await tx.connector.update({
          where: { id: connectorId },
          data: {
            status: ConnectorStatus.ACTIVE,
            lastSyncedAt: null,
            workspaceExternalId: tokenResult.projectId,
            name: `Gmail (${delegatedEmail})`,
            config: {
              ...currentConfig,
              serviceAccountEmail: tokenResult.serviceAccountEmail,
              delegatedEmail: tokenResult.delegatedUserEmail,
              projectId: tokenResult.projectId,
            },
          },
        });

        await tx.oAuthProvider.upsert({
          where: { connectorId: updated.id },
          update: {
            accessToken: tokenResult.accessToken,
            refreshToken: credentialsJson, // Store SA JSON as "refresh" for re-auth
            oauthScopes: [],
            updatedAt: new Date(),
          },
          create: {
            connectorId: updated.id,
            accessToken: tokenResult.accessToken,
            refreshToken: credentialsJson,
            oauthScopes: [],
            app: AppType.GMAIL,
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
