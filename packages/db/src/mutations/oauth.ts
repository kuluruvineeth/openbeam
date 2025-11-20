import type { AppType, OAuthProvider } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UpsertOAuthProviderInput {
  connectorId: string;
  app: AppType;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
}

export const upsertOAuthProvider = async (
  db: Database,
  data: UpsertOAuthProviderInput
): Promise<OAuthProvider> =>
  db.oAuthProvider.upsert({
    where: { connectorId: data.connectorId },
    create: {
      connectorId: data.connectorId,
      app: data.app,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiresAt: data.expiresAt,
      oauthScopes: data.scopes ?? [],
      clientId: data.clientId,
      clientSecret: data.clientSecret,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiresAt: data.expiresAt,
      oauthScopes: data.scopes ?? [],
      tokenRefreshedAt: new Date(),
    },
  });
