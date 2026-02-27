import { randomBytes } from "node:crypto";
import type { RouteHandler } from "@hono/zod-openapi";
import {
  createCookieConfig,
  createLogoutCookie,
  createSession,
  deleteSession,
  getSessionFromHeaders,
  type OAuthState,
  oauthManager,
  upsertUserFromOAuth,
  validateSession,
} from "@openplane/auth";
import prisma from "@openplane/db";
import type {
  callbackRoute,
  sessionRoute,
  signinRoute,
  signoutRoute,
} from "./auth.routes";

const cookieConfig = createCookieConfig();
const webUrl = cookieConfig.webUrl;
const serverUrl = cookieConfig.serverUrl;

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(encoded: string): OAuthState | null {
  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    ) as OAuthState;
  } catch {
    return null;
  }
}

export const signinHandler: RouteHandler<typeof signinRoute> = (c) => {
  const { provider: providerName } = c.req.valid("param");
  const { callbackUrl } = c.req.valid("query");

  const provider = oauthManager.get(providerName);
  if (!provider) {
    return c.json({ error: `Unknown provider: ${providerName}` }, 400);
  }

  const state: OAuthState = {
    provider: providerName,
    callbackUrl: callbackUrl || webUrl,
    nonce: randomBytes(16).toString("base64url"),
  };

  const redirectUri = `${serverUrl}/api/auth/callback/${providerName}`;
  const authUrl = provider.getAuthorizationUrl(encodeState(state), redirectUri);

  return c.redirect(authUrl.toString());
};

export const callbackHandler: RouteHandler<typeof callbackRoute> = async (
  c
) => {
  const { provider: providerName } = c.req.valid("param");
  const { code, state: stateParam, error } = c.req.valid("query");

  if (error) {
    return c.redirect(`${webUrl}/login?error=${encodeURIComponent(error)}`);
  }

  const provider = oauthManager.get(providerName);
  if (!provider) {
    return c.redirect(`${webUrl}/login?error=unknown_provider`);
  }

  const state = decodeState(stateParam);
  if (!state || state.provider !== providerName || !state.nonce) {
    return c.redirect(`${webUrl}/login?error=invalid_state`);
  }

  const redirectUri = `${serverUrl}/api/auth/callback/${providerName}`;

  const tokens = await provider.exchangeCode(code, redirectUri);
  const userInfo = await provider.getUserInfo(tokens.accessToken);
  const { userId, teamId } = await upsertUserFromOAuth(
    prisma,
    providerName,
    userInfo,
    tokens
  );

  const ipAddress =
    c.req.header("x-forwarded-for")?.split(",")[0] || c.req.header("x-real-ip");
  const userAgent = c.req.header("user-agent");
  const session = await createSession(prisma, userId, ipAddress, userAgent);

  const callbackUrl = new URL(state.callbackUrl);
  const isHttpScheme =
    callbackUrl.protocol === "https:" || callbackUrl.protocol === "http:";
  if (isHttpScheme) {
    callbackUrl.pathname = "/api/auth/callback";
  }
  callbackUrl.searchParams.set("token", session.token);
  if (teamId) {
    callbackUrl.searchParams.set("team_id", teamId);
  }

  return c.redirect(callbackUrl.toString());
};

export const signoutHandler: RouteHandler<typeof signoutRoute> = async (c) => {
  const token = getSessionFromHeaders(c.req.raw.headers);

  if (token) {
    await deleteSession(prisma, token);
  }

  const logoutCookie = createLogoutCookie(cookieConfig);
  c.header("Set-Cookie", logoutCookie);

  return c.json({ success: true });
};

export const sessionHandler: RouteHandler<typeof sessionRoute> = async (c) => {
  const token = getSessionFromHeaders(c.req.raw.headers);

  if (!token) {
    return c.json({ user: null });
  }

  const session = await validateSession(prisma, token);

  if (!session) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      teamId: session.user.teamId,
    },
  });
};
