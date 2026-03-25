import type { OAuthConfig } from "../types";
import {
  type LucidOAuthResult,
  LucidTokenResponseSchema,
  LucidUserInfoSchema,
} from "./types";

export const LUCID_TOKEN_LIFETIME_SECONDS = 3600;

export class LucidOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "LucidOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateLucidAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateLucidAuthUrl(
  params: GenerateLucidAuthUrlParams
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

export type ExchangeLucidCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeLucidCode(
  params: ExchangeLucidCodeParams
): Promise<LucidOAuthResult> {
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
    throw new LucidOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = LucidTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchUserInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.id,
    userEmail: userInfo.email,
    userName: userInfo.name,
    accountId: userInfo.accountId ?? userInfo.id,
  };
}

export type RefreshLucidTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshLucidTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshLucidToken(
  params: RefreshLucidTokenParams
): Promise<RefreshLucidTokenResult> {
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
    throw new LucidOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = LucidTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  accountId?: string;
}> {
  const response = await fetch("https://api.lucid.co/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Lucid-Api-Version": "1",
    },
  });

  if (!response.ok) {
    throw new LucidOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return LucidUserInfoSchema.parse(await response.json());
}
