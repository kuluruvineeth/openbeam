import prisma, {
  type AppType,
  ConnectorStatus,
  decryptIfEncrypted,
  encryptIfConfigured,
} from "@openplane/db";
import { refreshGmailToken } from "@openplane/integrations";

export async function refreshConnectorToken(
  connectorId: string
): Promise<string> {
  const oauth = await prisma.oAuthProvider.findUnique({
    where: { connectorId },
    include: {
      connector: {
        select: { status: true },
      },
    },
  });

  if (!oauth) {
    throw new Error(`OAuth provider not found for connector ${connectorId}`);
  }

  if (
    oauth.connector.status !== ConnectorStatus.ACTIVE &&
    oauth.connector.status !== ConnectorStatus.SYNCING
  ) {
    throw new Error(
      `Connector ${connectorId} is not active (status: ${oauth.connector.status})`
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
    let newToken: { accessToken: string; expiresIn: number };

    switch (oauth.app) {
      case "GMAIL":
        newToken = await refreshGmailToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "SLACK":
        throw new Error("Slack token refresh not implemented");

      default:
        throw new Error(`Token refresh not implemented for app: ${oauth.app}`);
    }

    const accessTokenEncrypted = encryptIfConfigured(newToken.accessToken);
    const tokenExpiresAt = new Date(Date.now() + newToken.expiresIn * 1000);

    await prisma.oAuthProvider.update({
      where: { connectorId },
      data: {
        accessToken: accessTokenEncrypted.encrypted,
        accessTokenIv: accessTokenEncrypted.iv,
        tokenExpiresAt,
        tokenRefreshedAt: new Date(),
        refreshFailures: 0,
        refreshError: null,
        lastRefreshAttempt: new Date(),
        updatedAt: new Date(),
      },
    });

    return newToken.accessToken;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";

    await prisma.oAuthProvider.update({
      where: { connectorId },
      data: {
        lastRefreshAttempt: new Date(),
        refreshFailures: { increment: 1 },
        refreshError: errorMessage,
        updatedAt: new Date(),
      },
    });

    const updatedOAuth = await prisma.oAuthProvider.findUnique({
      where: { connectorId },
      select: { refreshFailures: true },
    });

    if (updatedOAuth && updatedOAuth.refreshFailures >= 3) {
      await prisma.connector.update({
        where: { id: connectorId },
        data: {
          status: ConnectorStatus.AUTH_EXPIRED,
          statusChangedAt: new Date(),
          lastError: `Token refresh failed after ${updatedOAuth.refreshFailures} attempts: ${errorMessage}`,
          lastErrorAt: new Date(),
        },
      });
    }

    throw error;
  }
}

async function getConnectorsNeedingRefresh(
  bufferSeconds = 300
): Promise<{ connectorId: string; app: AppType }[]> {
  const threshold = new Date(Date.now() + bufferSeconds * 1000);

  const expiring = await prisma.oAuthProvider.findMany({
    where: {
      tokenExpiresAt: {
        lte: threshold,
      },
      refreshToken: {
        not: null,
      },
      connector: {
        status: {
          in: ["ACTIVE", "SYNCING"],
        },
      },
    },
    select: {
      connectorId: true,
      app: true,
    },
  });

  return expiring;
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
  const oauth = await prisma.oAuthProvider.findUnique({
    where: { connectorId },
    select: {
      accessToken: true,
      accessTokenIv: true,
      tokenExpiresAt: true,
    },
  });

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
