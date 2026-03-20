import type { OAuthConfig } from "../types";
import {
  type AtlassianOAuthResult,
  AtlassianSiteSchema,
  AtlassianTokenResponseSchema,
  AtlassianUserInfoSchema,
} from "./types";

const ATLASSIAN_USERINFO_URL = "https://api.atlassian.com/me";
const ATLASSIAN_ACCESSIBLE_RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";

export type GenerateAtlassianAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  prompt?: "consent";
};

export function generateAtlassianAuthUrl(
  params: GenerateAtlassianAuthUrlParams
): string {
  const {
    config,
    clientId,
    redirectUri,
    state,
    scopes,
    prompt = "consent",
  } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", prompt);

  return url.toString();
}

export type ExchangeAtlassianCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export class AtlassianOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo" | "resources";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo" | "resources",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AtlassianOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export async function exchangeAtlassianCode(
  params: ExchangeAtlassianCodeParams
): Promise<AtlassianOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new AtlassianOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = AtlassianTokenResponseSchema.parse(await tokenResponse.json());

  const sites = await fetchAccessibleResources(tokens.access_token);
  const site = sites[0];
  if (!site) {
    throw new AtlassianOAuthError(
      "resources",
      404,
      "No accessible Atlassian sites found"
    );
  }

  const user = await fetchAtlassianUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope?.split(" ") ?? [],
    userEmail: user.email,
    userId: user.account_id,
    displayName: user.name ?? undefined,
    cloudId: site.id,
    siteName: site.name,
    siteUrl: site.url,
  };
}

export type RefreshAtlassianTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshAtlassianTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
};

export async function refreshAtlassianToken(
  params: RefreshAtlassianTokenParams
): Promise<RefreshAtlassianTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AtlassianOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = AtlassianTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

export async function fetchAtlassianUserInfo(
  accessToken: string
): Promise<{ account_id: string; email: string; name?: string }> {
  const response = await fetch(ATLASSIAN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new AtlassianOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return AtlassianUserInfoSchema.parse(await response.json());
}

export async function fetchAccessibleResources(
  accessToken: string
): Promise<Array<{ id: string; name: string; url: string; scopes: string[] }>> {
  const response = await fetch(ATLASSIAN_ACCESSIBLE_RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new AtlassianOAuthError(
      "resources",
      response.status,
      `Accessible resources fetch failed: ${response.status}`
    );
  }

  const data = await response.json();
  return AtlassianSiteSchema.array().parse(data);
}
