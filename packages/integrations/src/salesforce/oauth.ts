import type { OAuthConfig } from "../types";
import {
  type SalesforceOAuthResult,
  SalesforceTokenResponseSchema,
  SalesforceUserInfoSchema,
} from "./types";

export class SalesforceOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "SalesforceOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateSalesforceAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateSalesforceAuthUrl(
  params: GenerateSalesforceAuthUrlParams
): string {
  const { config, clientId, redirectUri, state, scopes } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("prompt", "login consent");

  return url.toString();
}

export type ExchangeSalesforceCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeSalesforceCode(
  params: ExchangeSalesforceCodeParams
): Promise<SalesforceOAuthResult> {
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
    throw new SalesforceOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = SalesforceTokenResponseSchema.parse(
    await tokenResponse.json()
  );

  const userInfo = await fetchSalesforceUserInfo(
    tokens.access_token,
    tokens.instance_url
  );

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    instanceUrl: tokens.instance_url,
    userId: userInfo.sub,
    userEmail: userInfo.email ?? userInfo.preferred_username,
    displayName: userInfo.name ?? undefined,
    organizationId: userInfo.organization_id ?? undefined,
  };
}

export type RefreshSalesforceTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshSalesforceTokenResult = {
  accessToken: string;
  expiresIn: number;
  instanceUrl: string;
};

export async function refreshSalesforceToken(
  params: RefreshSalesforceTokenParams
): Promise<RefreshSalesforceTokenResult> {
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
    throw new SalesforceOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = SalesforceTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: 7200,
    instanceUrl: data.instance_url,
  };
}

async function fetchSalesforceUserInfo(
  accessToken: string,
  instanceUrl: string
): Promise<{
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  organization_id?: string;
}> {
  const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new SalesforceOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return SalesforceUserInfoSchema.parse(await response.json());
}
