import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Database } from "../index";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const ACCESS_TOKEN_TTL_SECONDS = 7200;
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;
const AUTH_CODE_TTL_SECONDS = 300;
const REPLAY_WINDOW_MS = 600_000;

function randomBase62(length: number): string {
  let output = "";
  while (output.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      if (output.length >= length) {
        break;
      }
      output += BASE62[byte % BASE62.length];
    }
  }
  return output;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export interface CreateOAuthAppInput {
  name: string;
  description?: string;
  overview?: string;
  developerName?: string;
  logoUrl?: string;
  website?: string;
  installUrl?: string;
  screenshots?: string[];
  redirectUris: string[];
  scopes?: string[];
  isPublic?: boolean;
  teamId: string;
  createdBy: string;
}

export async function createOAuthApplication(
  db: Database,
  input: CreateOAuthAppInput
) {
  const clientId = `op_client_${randomBase62(24)}`;
  const rawSecret = `op_app_secret_${randomBase62(32)}`;
  const secretHash = sha256(rawSecret);

  const baseSlug = generateSlug(input.name);
  let slug = baseSlug;
  while (await db.oAuthApplication.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${randomBase62(4).toLowerCase()}`;
  }

  const app = await db.oAuthApplication.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      overview: input.overview,
      developerName: input.developerName,
      logoUrl: input.logoUrl,
      website: input.website,
      installUrl: input.installUrl,
      screenshots: input.screenshots ?? [],
      redirectUris: input.redirectUris,
      clientId,
      clientSecret: secretHash,
      scopes: input.scopes ?? [],
      teamId: input.teamId,
      createdBy: input.createdBy,
      isPublic: input.isPublic ?? false,
      status: "draft",
    },
  });

  return { id: app.id, clientId, clientSecret: rawSecret, slug };
}

export interface UpdateOAuthAppInput {
  name?: string;
  description?: string;
  overview?: string;
  developerName?: string;
  logoUrl?: string | null;
  website?: string | null;
  installUrl?: string | null;
  screenshots?: string[];
  redirectUris?: string[];
  scopes?: string[];
  isPublic?: boolean;
  active?: boolean;
}

export async function updateOAuthApplication(
  db: Database,
  id: string,
  teamId: string,
  input: UpdateOAuthAppInput
) {
  return await db.oAuthApplication.updateMany({
    where: { id, teamId },
    data: input,
  });
}

export async function deleteOAuthApplication(
  db: Database,
  id: string,
  teamId: string
) {
  await db.oAuthAccessToken.deleteMany({
    where: { application: { id, teamId } },
  });
  await db.oAuthAuthorizationCode.deleteMany({
    where: { application: { id, teamId } },
  });
  return await db.oAuthApplication.deleteMany({
    where: { id, teamId },
  });
}

export async function regenerateOAuthSecret(
  db: Database,
  id: string,
  teamId: string
) {
  const rawSecret = `op_app_secret_${randomBase62(32)}`;
  const secretHash = sha256(rawSecret);

  await db.oAuthApplication.updateMany({
    where: { id, teamId },
    data: { clientSecret: secretHash },
  });

  return { clientSecret: rawSecret };
}

export async function updateOAuthAppStatus(
  db: Database,
  id: string,
  teamId: string,
  status: string
) {
  return await db.oAuthApplication.updateMany({
    where: { id, teamId },
    data: { status },
  });
}

export interface CreateDCRInput {
  name: string;
  redirectUris: string[];
  scopes?: string[];
  logoUrl?: string;
  website?: string;
}

export async function createDCRApplication(
  db: Database,
  input: CreateDCRInput
) {
  const clientId = `op_client_${randomBase62(24)}`;
  const slug = `dcr-${randomBase62(12).toLowerCase()}`;

  const app = await db.oAuthApplication.create({
    data: {
      name: input.name,
      slug,
      redirectUris: input.redirectUris,
      clientId,
      scopes: input.scopes ?? [],
      logoUrl: input.logoUrl,
      website: input.website,
      isPublic: true,
      active: true,
      status: "approved",
    },
  });

  return { id: app.id, clientId };
}

export async function claimDCRApplication(
  db: Database,
  appId: string,
  teamId: string,
  userId: string
) {
  return await db.oAuthApplication.update({
    where: { id: appId },
    data: { teamId, createdBy: userId },
  });
}

export interface CreateAuthCodeInput {
  applicationId: string;
  userId: string;
  teamId: string;
  scopes: string[];
  redirectUri: string;
  codeChallenge?: string;
}

export async function createAuthorizationCode(
  db: Database,
  input: CreateAuthCodeInput
) {
  const code = `op_auth_code_${randomBase62(32)}`;
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000);

  await db.oAuthAuthorizationCode.create({
    data: {
      code,
      applicationId: input.applicationId,
      userId: input.userId,
      teamId: input.teamId,
      scopes: input.scopes,
      redirectUri: input.redirectUri,
      expiresAt,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallenge ? "S256" : undefined,
    },
  });

  return { code, expiresAt };
}

export interface ExchangeCodeInput {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier?: string;
}

export async function exchangeAuthorizationCode(
  db: Database,
  input: ExchangeCodeInput
) {
  const authCode = await db.oAuthAuthorizationCode.findUnique({
    where: { code: input.code },
    include: {
      application: {
        select: {
          id: true,
          clientId: true,
          clientSecret: true,
          isPublic: true,
          active: true,
        },
      },
    },
  });

  if (!authCode) {
    throw new Error("Invalid authorization code");
  }

  if (authCode.used) {
    const windowStart = new Date(
      authCode.createdAt.getTime() - REPLAY_WINDOW_MS
    );
    const windowEnd = new Date(authCode.createdAt.getTime() + REPLAY_WINDOW_MS);
    await db.oAuthAccessToken.updateMany({
      where: {
        applicationId: authCode.applicationId,
        userId: authCode.userId,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      data: { revoked: true, revokedAt: new Date() },
    });
    throw new Error("Authorization code already used");
  }

  if (authCode.expiresAt < new Date()) {
    throw new Error("Authorization code expired");
  }

  if (authCode.application.clientId !== input.clientId) {
    throw new Error("Invalid client credentials");
  }

  if (!authCode.application.active) {
    throw new Error("Application is inactive");
  }

  if (authCode.redirectUri !== input.redirectUri) {
    throw new Error("Redirect URI mismatch");
  }

  if (
    !authCode.application.isPublic &&
    authCode.application.clientSecret &&
    input.clientSecret
  ) {
    const inputHash = sha256(input.clientSecret);
    if (!safeCompare(inputHash, authCode.application.clientSecret)) {
      throw new Error("Invalid client credentials");
    }
  }

  if (authCode.codeChallenge) {
    if (!input.codeVerifier) {
      throw new Error("Code verifier required");
    }
    const computed = createHash("sha256")
      .update(input.codeVerifier)
      .digest("base64url");
    if (computed !== authCode.codeChallenge) {
      throw new Error("Invalid code verifier");
    }
  }

  await db.oAuthAuthorizationCode.update({
    where: { id: authCode.id },
    data: { used: true },
  });

  const accessToken = `op_access_${randomBase62(32)}`;
  const refreshToken = `op_refresh_${randomBase62(32)}`;
  const now = new Date();

  await db.oAuthAccessToken.create({
    data: {
      tokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      applicationId: authCode.applicationId,
      userId: authCode.userId,
      teamId: authCode.teamId,
      scopes: authCode.scopes,
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
      refreshTokenExpiresAt: new Date(
        now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000
      ),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: authCode.scopes.join(" "),
    tokenType: "Bearer" as const,
  };
}

export interface RefreshTokenInput {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
}

export async function refreshOAuthAccessToken(
  db: Database,
  input: RefreshTokenInput
) {
  const hash = sha256(input.refreshToken);
  const existing = await db.oAuthAccessToken.findUnique({
    where: { refreshTokenHash: hash },
    include: {
      application: {
        select: {
          clientId: true,
          clientSecret: true,
          isPublic: true,
          active: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Invalid refresh token");
  }
  if (existing.revoked) {
    throw new Error("Refresh token revoked");
  }
  if (
    existing.refreshTokenExpiresAt &&
    existing.refreshTokenExpiresAt < new Date()
  ) {
    throw new Error("Refresh token expired");
  }
  if (existing.application.clientId !== input.clientId) {
    throw new Error("Invalid client credentials");
  }
  if (!existing.application.active) {
    throw new Error("Application is inactive");
  }

  if (
    !existing.application.isPublic &&
    existing.application.clientSecret &&
    input.clientSecret
  ) {
    const inputHash = sha256(input.clientSecret);
    if (!safeCompare(inputHash, existing.application.clientSecret)) {
      throw new Error("Invalid client credentials");
    }
  }

  let scopes = existing.scopes;
  if (input.scope) {
    const requested = input.scope.split(" ");
    const invalid = requested.filter((s) => !existing.scopes.includes(s));
    if (invalid.length > 0) {
      throw new Error(`Invalid scope: ${invalid.join(", ")}`);
    }
    scopes = requested;
  }

  await db.oAuthAccessToken.update({
    where: { id: existing.id },
    data: { revoked: true, revokedAt: new Date() },
  });

  const accessToken = `op_access_${randomBase62(32)}`;
  const refreshToken = `op_refresh_${randomBase62(32)}`;
  const now = new Date();

  await db.oAuthAccessToken.create({
    data: {
      tokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      applicationId: existing.applicationId,
      userId: existing.userId,
      teamId: existing.teamId,
      scopes,
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
      refreshTokenExpiresAt: new Date(
        now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000
      ),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: scopes.join(" "),
    tokenType: "Bearer" as const,
  };
}

export async function revokeOAuthAccessToken(db: Database, tokenValue: string) {
  const hash = sha256(tokenValue);

  const byAccess = await db.oAuthAccessToken.updateMany({
    where: { tokenHash: hash, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });

  if (byAccess.count > 0) {
    return true;
  }

  const byRefresh = await db.oAuthAccessToken.updateMany({
    where: { refreshTokenHash: hash, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });

  return byRefresh.count > 0;
}

export async function revokeAllTokensForApp(
  db: Database,
  applicationId: string,
  userId?: string
) {
  return await db.oAuthAccessToken.updateMany({
    where: {
      applicationId,
      revoked: false,
      ...(userId ? { userId } : {}),
    },
    data: { revoked: true, revokedAt: new Date() },
  });
}

export async function updateOAuthTokenLastUsed(db: Database, tokenId: string) {
  return await db.oAuthAccessToken.update({
    where: { id: tokenId },
    data: { lastUsedAt: new Date() },
  });
}
