import type { OAuthConfig } from "../types";
import {
  type BoxOAuthResult,
  BoxTokenResponseSchema,
  BoxUserInfoSchema,
} from "./types";

export const BOX_TOKEN_LIFETIME_SECONDS = 3600;

export class BoxOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "user";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "user",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "BoxOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateBoxAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateBoxAuthUrl(params: GenerateBoxAuthUrlParams): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeBoxCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeBoxCode(
  params: ExchangeBoxCodeParams
): Promise<BoxOAuthResult> {
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
    throw new BoxOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = BoxTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchBoxUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.id,
    userEmail: userInfo.login,
    displayName: userInfo.name,
    enterpriseId: userInfo.enterprise?.id,
  };
}

export type RefreshBoxTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshBoxTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function refreshBoxToken(
  params: RefreshBoxTokenParams
): Promise<RefreshBoxTokenResult> {
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
    throw new BoxOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = BoxTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}

async function fetchBoxUserInfo(accessToken: string) {
  const response = await fetch("https://api.box.com/2.0/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new BoxOAuthError(
      "user",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return BoxUserInfoSchema.parse(await response.json());
}
