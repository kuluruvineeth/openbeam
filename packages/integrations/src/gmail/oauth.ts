import { AuthType } from "../types";
import gmailApp from "./config";
import { type OAuthResult, TokenResponseSchema, UserInfoSchema } from "./types";

const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getOAuthConfig() {
  if (gmailApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Gmail app is not configured for OAuth2");
  }
  return gmailApp.auth.config;
}

export type GenerateGmailAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGmailAuthUrl(
  params: GenerateGmailAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

export type ExchangeGmailCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeGmailCode(
  params: ExchangeGmailCodeParams
): Promise<OAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Gmail OAuth failed: ${await res.text()}`);
  }

  const tokens = TokenResponseSchema.parse(await res.json());

  // Fetch user info
  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch user info: ${userRes.status}`);
  }

  const user = UserInfoSchema.parse(await userRes.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope?.split(" ") ?? [],
    userEmail: user.email,
    userId: user.id,
    hostedDomain: user.hd,
  };
}

export type RefreshGmailTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export async function refreshGmailToken(
  params: RefreshGmailTokenParams
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${await res.text()}`);
  }

  const data = TokenResponseSchema.parse(await res.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
