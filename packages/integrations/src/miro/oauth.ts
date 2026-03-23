import type { OAuthConfig } from "../types";
import {
  type MiroOAuthResult,
  MiroTokenResponseSchema,
  MiroUserInfoSchema,
} from "./types";

export const MIRO_TOKEN_LIFETIME_SECONDS = 3600;

export class MiroOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "MiroOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateMiroAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateMiroAuthUrl(params: GenerateMiroAuthUrlParams): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeMiroCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeMiroCode(
  params: ExchangeMiroCodeParams
): Promise<MiroOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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
    throw new MiroOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = MiroTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    teamId: tokens.team_id,
    userId: tokens.user_id,
    userName: userInfo.name,
    userEmail: userInfo.email,
  };
}

export type RefreshMiroTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshMiroTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshMiroToken(
  params: RefreshMiroTokenParams
): Promise<RefreshMiroTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new MiroOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = MiroTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(accessToken: string) {
  const response = await fetch("https://api.miro.com/v1/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new MiroOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return MiroUserInfoSchema.parse(await response.json());
}
