import { AuthType } from "../types";
import zoomApp from "./config";
import {
  type ZoomOAuthResult,
  ZoomTokenResponseSchema,
  ZoomUserInfoSchema,
} from "./types";

export class ZoomOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ZoomOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

function getOAuthConfig() {
  if (zoomApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Zoom app is not configured for OAuth2");
  }
  return zoomApp.auth.config;
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

export type GenerateZoomAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateZoomAuthUrl(params: GenerateZoomAuthUrlParams): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeZoomCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeZoomCode(
  params: ExchangeZoomCodeParams
): Promise<ZoomOAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
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
    throw new ZoomOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = ZoomTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchZoomUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope.split(" ").filter(Boolean),
    userId: userInfo.id,
    email: userInfo.email,
    displayName:
      userInfo.display_name ??
      [userInfo.first_name, userInfo.last_name].filter(Boolean).join(" ") ??
      userInfo.email,
    accountId: userInfo.account_id,
  };
}

export type RefreshZoomTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshZoomTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function refreshZoomToken(
  params: RefreshZoomTokenParams
): Promise<RefreshZoomTokenResult> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ZoomOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const tokens = ZoomTokenResponseSchema.parse(await response.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

async function fetchZoomUserInfo(accessToken: string) {
  const response = await fetch("https://api.zoom.us/v2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new ZoomOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return ZoomUserInfoSchema.parse(await response.json());
}
