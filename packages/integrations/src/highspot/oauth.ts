import type { OAuthConfig } from "../types";
import {
  type HighspotOAuthResult,
  HighspotTokenResponseSchema,
  HighspotUserInfoSchema,
} from "./types";

export const HIGHSPOT_TOKEN_LIFETIME_SECONDS = 3600;

export class HighspotOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HighspotOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateHighspotAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateHighspotAuthUrl(
  params: GenerateHighspotAuthUrlParams
): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (config.scopes?.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }

  return url.toString();
}

export type ExchangeHighspotCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeHighspotCode(
  params: ExchangeHighspotCodeParams
): Promise<HighspotOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new HighspotOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = HighspotTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.id,
    userEmail: userInfo.email,
    userName: userInfo.name,
    orgId: userInfo.organization?.id ?? "",
    orgName: userInfo.organization?.name,
    domain: userInfo.organization?.domain ?? "app.highspot.com",
  };
}

export type RefreshHighspotTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshHighspotTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshHighspotToken(
  params: RefreshHighspotTokenParams
): Promise<RefreshHighspotTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HighspotOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = HighspotTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(accessToken: string) {
  const response = await fetch("https://api.highspot.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new HighspotOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return HighspotUserInfoSchema.parse(await response.json());
}
