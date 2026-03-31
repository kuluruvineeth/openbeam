import db, {
  decryptIfEncrypted,
  findConnectorById,
  getOAuthProvider,
} from "@openbeam/db";
import { ActionAuthError } from "./errors";
import type { ActionCredentials } from "./types";

export async function resolveCredentials(
  connectorId: string,
  teamId: string
): Promise<{ credentials: ActionCredentials; connectorType: string }> {
  const [connector, oauth] = await Promise.all([
    findConnectorById(db, connectorId),
    getOAuthProvider(db, connectorId),
  ]);

  if (!connector || connector.teamId !== teamId) {
    throw new ActionAuthError("Connector not found or access denied");
  }

  if (connector.status !== "ACTIVE" && connector.status !== "SYNCING") {
    throw new ActionAuthError(
      `Connector is not active (status: ${connector.status})`
    );
  }

  const config: Record<string, unknown> = {};

  if (connector.config && typeof connector.config === "object") {
    Object.assign(config, connector.config);
  }

  if (!oauth) {
    return {
      credentials: { accessToken: "", config },
      connectorType: connector.app,
    };
  }

  const accessToken =
    decryptIfEncrypted(oauth.accessToken, oauth.accessTokenIv) ?? "";

  const syncToken = decryptIfEncrypted(
    oauth.syncAccessToken,
    oauth.syncAccessTokenIv
  );

  if (syncToken) {
    config.syncAccessToken = syncToken;
  }

  if (oauth.metadata && typeof oauth.metadata === "object") {
    Object.assign(config, oauth.metadata);
  }

  return {
    credentials: {
      accessToken,
      refreshToken:
        decryptIfEncrypted(oauth.refreshToken, oauth.refreshTokenIv) ??
        undefined,
      config,
    },
    connectorType: connector.app,
  };
}
