import prisma, {
  type AppType,
  ConnectorStatus,
  getConnectorsNeedingRefresh as dbGetConnectorsNeedingRefresh,
  decryptIfEncrypted,
  findConnectorById,
  getOAuthProvider,
  recordRefreshFailure,
  updateConnector,
  updateOAuthTokens,
} from "@openplane/db";
import {
  refreshGitHubToken,
  refreshGmailToken,
  refreshGoogleDriveToken,
  refreshLinearToken,
} from "@openplane/integrations";

export async function refreshConnectorToken(
  connectorId: string
): Promise<string> {
  const [oauth, connector] = await Promise.all([
    getOAuthProvider(prisma, connectorId),
    findConnectorById(prisma, connectorId),
  ]);

  if (!oauth) {
    throw new Error(`OAuth provider not found for connector ${connectorId}`);
  }

  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  if (
    connector.status !== ConnectorStatus.ACTIVE &&
    connector.status !== ConnectorStatus.SYNCING
  ) {
    throw new Error(
      `Connector ${connectorId} is not active (status: ${connector.status})`
    );
  }

  const refreshToken = decryptIfEncrypted(
    oauth.refreshToken,
    oauth.refreshTokenIv
  );
  const clientId = oauth.clientId;
  const clientSecret = decryptIfEncrypted(
    oauth.clientSecret,
    oauth.clientSecretIv
  );

  if (!refreshToken) {
    throw new Error(`No refresh token available for connector ${connectorId}`);
  }

  if (!(clientId && clientSecret)) {
    throw new Error(
      `Missing OAuth client credentials for connector ${connectorId}`
    );
  }

  try {
    let newToken: {
      accessToken: string;
      expiresIn: number;
      refreshToken?: string;
    };

    switch (oauth.app) {
      case "GMAIL":
        newToken = await refreshGmailToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "GOOGLE_DRIVE":
        newToken = await refreshGoogleDriveToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "LINEAR": {
        const linearResult = await refreshLinearToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: linearResult.accessToken,
          expiresIn: linearResult.expiresIn,
          refreshToken: linearResult.refreshToken,
        };
        break;
      }

      case "GITHUB": {
        const githubResult = await refreshGitHubToken({
          clientId,
          clientSecret,
          refreshToken,
        });

        if (githubResult.expiresIn === undefined) {
          throw new Error("GitHub token refresh did not return expiresIn");
        }

        newToken = {
          accessToken: githubResult.accessToken,
          expiresIn: githubResult.expiresIn,
          refreshToken: githubResult.refreshToken,
        };
        break;
      }

      case "SLACK":
        throw new Error("Slack token refresh not implemented");

      case "NOTION":
        throw new Error("Notion tokens do not expire");

      default:
        throw new Error(`Token refresh not implemented for app: ${oauth.app}`);
    }

    await updateOAuthTokens(prisma, {
      connectorId,
      accessToken: newToken.accessToken,
      expiresIn: newToken.expiresIn,
      refreshToken: newToken.refreshToken,
    });

    return newToken.accessToken;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";

    const updatedOAuth = await recordRefreshFailure(
      prisma,
      connectorId,
      errorMessage
    );

    if (updatedOAuth.refreshFailures >= 3) {
      await updateConnector(prisma, connectorId, {
        status: ConnectorStatus.AUTH_EXPIRED,
        statusChangedAt: new Date(),
        lastError: `Token refresh failed after ${updatedOAuth.refreshFailures} attempts: ${errorMessage}`,
        lastErrorAt: new Date(),
      });
    }

    throw error;
  }
}

function getConnectorsNeedingRefresh(
  bufferSeconds = 300
): Promise<{ connectorId: string; app: AppType }[]> {
  return dbGetConnectorsNeedingRefresh(prisma, bufferSeconds);
}

export async function refreshExpiringTokens(bufferSeconds = 300): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: Array<{ connectorId: string; app: AppType; error: string }>;
}> {
  const connectors = await getConnectorsNeedingRefresh(bufferSeconds);

  const results = {
    total: connectors.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ connectorId: string; app: AppType; error: string }>,
  };

  for (const { connectorId, app } of connectors) {
    try {
      await refreshConnectorToken(connectorId);
      results.success += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push({
        connectorId,
        app,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function getValidAccessToken(
  connectorId: string,
  bufferSeconds = 300
): Promise<string> {
  const oauth = await getOAuthProvider(prisma, connectorId);

  if (!oauth?.accessToken) {
    throw new Error(`No access token found for connector ${connectorId}`);
  }

  const needsRefresh =
    oauth.tokenExpiresAt &&
    Date.now() >= oauth.tokenExpiresAt.getTime() - bufferSeconds * 1000;

  if (needsRefresh) {
    return await refreshConnectorToken(connectorId);
  }

  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );

  if (!accessToken) {
    throw new Error(
      `Failed to decrypt access token for connector ${connectorId}`
    );
  }

  return accessToken;
}
