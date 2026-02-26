import { randomBytes } from "node:crypto";
import type { Database } from "@openplane/db";
import {
  createUser,
  createSession as dbCreateSession,
  deleteSessionByToken,
  deleteSessionsByUserId,
  getSessionByToken,
  getUserByEmail,
  updateUserImage,
  upsertAccount,
} from "@openplane/db";
import type { OAuthTokens, OAuthUserInfo } from "../oauth/types";
import {
  type CookieConfig,
  getCookieOptions,
  parseCookies,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  serializeCookie,
} from "./cookie";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  teamId: string | null;
}

export interface SessionData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthSession {
  user: SessionUser;
  session: SessionData;
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  prisma: Database,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SessionData> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const session = await dbCreateSession(prisma, {
    token,
    userId,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    expiresAt: session.expiresAt,
  };
}

export async function validateSession(
  prisma: Database,
  token: string
): Promise<AuthSession | null> {
  const session = await getSessionByToken(prisma, token);

  if (!session) {
    return null;
  }
  if (session.expiresAt < new Date()) {
    await deleteSessionByToken(prisma, token);
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      emailVerified: session.user.emailVerified,
      teamId: session.user.teamId,
    },
    session: {
      id: session.id,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
    },
  };
}

export async function deleteSession(
  prisma: Database,
  token: string
): Promise<void> {
  await deleteSessionByToken(prisma, token);
}

export async function deleteUserSessions(
  prisma: Database,
  userId: string
): Promise<void> {
  await deleteSessionsByUserId(prisma, userId);
}

export interface OAuthUpsertResult {
  userId: string;
  teamId: string | null;
}

export async function upsertUserFromOAuth(
  prisma: Database,
  provider: string,
  userInfo: OAuthUserInfo,
  tokens: OAuthTokens
): Promise<OAuthUpsertResult> {
  const existingUser = await getUserByEmail(prisma, userInfo.email);

  if (existingUser) {
    await upsertAccount(prisma, {
      providerId: provider,
      accountId: userInfo.id,
      userId: existingUser.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      accessTokenExpiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null,
      scope: tokens.scope,
    });

    if (userInfo.image && userInfo.image !== existingUser.image) {
      await updateUserImage(prisma, existingUser.id, userInfo.image);
    }

    return { userId: existingUser.id, teamId: existingUser.teamId };
  }

  const newUser = await createUser(prisma, {
    email: userInfo.email,
    name: userInfo.name,
    image: userInfo.image,
    emailVerified: userInfo.emailVerified,
  });

  await upsertAccount(prisma, {
    providerId: provider,
    accountId: userInfo.id,
    userId: newUser.id,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
    accessTokenExpiresAt: tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null,
    scope: tokens.scope,
  });

  return { userId: newUser.id, teamId: newUser.teamId };
}

export function getSessionFromHeaders(headers: Headers): string | null {
  const cookieHeader = headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && !token.startsWith("op_")) {
      return token;
    }
  }

  return null;
}

export function createSessionCookie(
  token: string,
  config: CookieConfig
): string {
  const options = getCookieOptions(config);
  return serializeCookie({
    name: SESSION_COOKIE_NAME,
    value: token,
    maxAge: SESSION_DURATION_SECONDS,
    ...options,
  });
}

export function createLogoutCookie(config: CookieConfig): string {
  const options = getCookieOptions(config);
  return serializeCookie({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    ...options,
  });
}
