import type { OAuthConfig } from "../types";
import {
  type PanoptoOAuthResult,
  PanoptoTokenResponseSchema,
  PanoptoUserInfoSchema,
} from "./types";

export const PANOPTO_TOKEN_LIFETIME_SECONDS = 3600;

export class PanoptoOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "PanoptoOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GeneratePanoptoAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  instanceUrl: string;
};

export function generatePanoptoAuthUrl(
  params: GeneratePanoptoAuthUrlParams
): string {
  const { clientId, redirectUri, state, instanceUrl } = params;

  const url = new URL(`${instanceUrl}/Panopto/oauth2/connect/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "api openid");
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangePanoptoCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  instanceUrl: string;
};

export async function exchangePanoptoCode(
  params: ExchangePanoptoCodeParams
): Promise<PanoptoOAuthResult> {
  const { clientId, clientSecret, code, redirectUri, instanceUrl } = params;

  const tokenResponse = await fetch(
    `${instanceUrl}/Panopto/oauth2/connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new PanoptoOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = PanoptoTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchPanoptoUserInfo(tokens.access_token, instanceUrl);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.UserId,
    userEmail: userInfo.Email,
    displayName: `${userInfo.FirstName} ${userInfo.LastName}`.trim(),
    instanceUrl,
  };
}

export type RefreshPanoptoTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  instanceUrl: string;
};

export type RefreshPanoptoTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshPanoptoToken(
  params: RefreshPanoptoTokenParams
): Promise<RefreshPanoptoTokenResult> {
  const { clientId, clientSecret, refreshToken, instanceUrl } = params;

  const response = await fetch(`${instanceUrl}/Panopto/oauth2/connect/token`, {
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
    throw new PanoptoOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = PanoptoTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchPanoptoUserInfo(accessToken: string, instanceUrl: string) {
  const response = await fetch(`${instanceUrl}/Panopto/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new PanoptoOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return PanoptoUserInfoSchema.parse(await response.json());
}
