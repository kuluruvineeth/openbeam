import type { OAuthConfig } from "../types";
import {
  type HubSpotOAuthResult,
  HubSpotTokenInfoSchema,
  HubSpotTokenResponseSchema,
} from "./types";

export const HUBSPOT_TOKEN_LIFETIME_SECONDS = 1800;

export class HubSpotOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "tokeninfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "tokeninfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HubSpotOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateHubSpotAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateHubSpotAuthUrl(
  params: GenerateHubSpotAuthUrlParams
): string {
  const { config, clientId, redirectUri, state, scopes } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));

  return url.toString();
}

export type ExchangeHubSpotCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeHubSpotCode(
  params: ExchangeHubSpotCodeParams
): Promise<HubSpotOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new HubSpotOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = HubSpotTokenResponseSchema.parse(await tokenResponse.json());

  const tokenInfo = await fetchTokenInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    portalId: String(tokenInfo.hub_id),
    userId: String(tokenInfo.user_id),
    userEmail: tokenInfo.user,
    hubDomain: tokenInfo.hub_domain,
  };
}

export type RefreshHubSpotTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshHubSpotTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshHubSpotToken(
  params: RefreshHubSpotTokenParams
): Promise<RefreshHubSpotTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HubSpotOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = HubSpotTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchTokenInfo(accessToken: string) {
  const response = await fetch(
    `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`
  );

  if (!response.ok) {
    throw new HubSpotOAuthError(
      "tokeninfo",
      response.status,
      `Token info fetch failed: ${response.status}`
    );
  }

  return HubSpotTokenInfoSchema.parse(await response.json());
}
