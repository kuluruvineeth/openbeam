import type {
  AppType,
  OAuthProvider,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";
import { encryptIfConfigured } from "../lib/encryption";

type OAuthProviderClient = Pick<Database, "oAuthProvider">;

export interface UpsertOAuthProviderInput {
  connectorId: string;
  app: AppType;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  expiresIn?: number;
  scopes?: string[];
  tokenType?: string;
  clientId?: string | null;
  clientSecret?: string | null;
}

export const upsertOAuthProvider = (
  db: OAuthProviderClient,
  data: UpsertOAuthProviderInput
): Prisma.Prisma__OAuthProviderClient<OAuthProvider> => {
  // Encrypt sensitive tokens
  const accessTokenEncrypted = encryptIfConfigured(data.accessToken);
  const refreshTokenEncrypted = encryptIfConfigured(data.refreshToken);
  const clientSecretEncrypted = encryptIfConfigured(data.clientSecret);

  const tokenExpiresAt =
    data.expiresAt ??
    (data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : null);

  return db.oAuthProvider.upsert({
    where: { connectorId: data.connectorId },
    create: {
      connectorId: data.connectorId,
      app: data.app,
      accessToken: accessTokenEncrypted.encrypted,
      accessTokenIv: accessTokenEncrypted.iv,
      refreshToken: refreshTokenEncrypted.encrypted,
      refreshTokenIv: refreshTokenEncrypted.iv,
      tokenExpiresAt,
      tokenRefreshedAt: new Date(),
      oauthScopes: data.scopes ?? [],
      tokenScopes: data.scopes ?? [],
      tokenType: data.tokenType ?? "Bearer",
      clientId: data.clientId ?? null,
      clientSecret: clientSecretEncrypted.encrypted,
      clientSecretIv: clientSecretEncrypted.iv,
    },
    update: {
      accessToken: accessTokenEncrypted.encrypted,
      accessTokenIv: accessTokenEncrypted.iv,
      refreshToken: refreshTokenEncrypted.encrypted,
      refreshTokenIv: refreshTokenEncrypted.iv,
      tokenExpiresAt,
      tokenRefreshedAt: new Date(),
      oauthScopes: data.scopes ?? [],
      tokenScopes: data.scopes ?? [],
      tokenType: data.tokenType ?? "Bearer",
      ...(data.clientId && { clientId: data.clientId }),
      ...(data.clientSecret && {
        clientSecret: clientSecretEncrypted.encrypted,
        clientSecretIv: clientSecretEncrypted.iv,
      }),
      updatedAt: new Date(),
    },
  });
};

export interface UpdateOAuthTokensInput {
  connectorId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
  scopes?: string[];
}

export const updateOAuthTokens = (
  db: OAuthProviderClient,
  data: UpdateOAuthTokensInput
): Prisma.Prisma__OAuthProviderClient<OAuthProvider> => {
  const accessTokenEncrypted = encryptIfConfigured(data.accessToken);
  const refreshTokenEncrypted = data.refreshToken
    ? encryptIfConfigured(data.refreshToken)
    : { encrypted: undefined, iv: undefined };

  const tokenExpiresAt = data.expiresIn
    ? new Date(Date.now() + data.expiresIn * 1000)
    : undefined;

  return db.oAuthProvider.update({
    where: { connectorId: data.connectorId },
    data: {
      accessToken: accessTokenEncrypted.encrypted,
      accessTokenIv: accessTokenEncrypted.iv,
      ...(refreshTokenEncrypted.encrypted && {
        refreshToken: refreshTokenEncrypted.encrypted,
        refreshTokenIv: refreshTokenEncrypted.iv,
      }),
      ...(tokenExpiresAt && { tokenExpiresAt }),
      ...(data.scopes && { tokenScopes: data.scopes }),
      tokenRefreshedAt: new Date(),
      refreshFailures: 0,
      refreshError: null,
      lastRefreshAttempt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Record a failed token refresh attempt
 */
export const recordRefreshFailure = (
  db: OAuthProviderClient,
  connectorId: string,
  error: string
): Prisma.Prisma__OAuthProviderClient<OAuthProvider> =>
  db.oAuthProvider.update({
    where: { connectorId },
    data: {
      lastRefreshAttempt: new Date(),
      refreshFailures: { increment: 1 },
      refreshError: error,
      updatedAt: new Date(),
    },
  });

/**
 * Get OAuth provider with decryption info for a connector
 */
export const getOAuthProvider = async (
  db: OAuthProviderClient,
  connectorId: string
): Promise<OAuthProvider | null> =>
  db.oAuthProvider.findUnique({
    where: { connectorId },
  });
