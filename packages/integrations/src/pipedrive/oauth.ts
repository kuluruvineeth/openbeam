import type { OAuthConfig } from "../types";
import {
  type PipedriveOAuthResult,
  PipedriveTokenResponseSchema,
  PipedriveUserInfoSchema,
} from "./types";

export const PIPEDRIVE_TOKEN_LIFETIME_SECONDS = 3600;

export class PipedriveOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "PipedriveOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GeneratePipedriveAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generatePipedriveAuthUrl(
  params: GeneratePipedriveAuthUrlParams
): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangePipedriveCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangePipedriveCode(
  params: ExchangePipedriveCodeParams
): Promise<PipedriveOAuthResult> {
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
    throw new PipedriveOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = PipedriveTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchUserInfo(tokens.api_domain, tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    apiDomain: tokens.api_domain,
    userId: String(userInfo.data.id),
    userEmail: userInfo.data.email,
    userName: userInfo.data.name,
    companyId: String(userInfo.data.company_id),
    companyName: userInfo.data.company_name,
    companyDomain: userInfo.data.company_domain,
  };
}

export type RefreshPipedriveTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshPipedriveTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshPipedriveToken(
  params: RefreshPipedriveTokenParams
): Promise<RefreshPipedriveTokenResult> {
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
    throw new PipedriveOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = PipedriveTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(apiDomain: string, accessToken: string) {
  const response = await fetch(`${apiDomain}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new PipedriveOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return PipedriveUserInfoSchema.parse(await response.json());
}
