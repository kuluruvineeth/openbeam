import type { OAuthConfig } from "../types";
import {
  ProcoreCompanySchema,
  type ProcoreOAuthResult,
  ProcoreTokenResponseSchema,
  ProcoreUserInfoSchema,
} from "./types";

export const PROCORE_TOKEN_LIFETIME_SECONDS = 7200;

const PROCORE_API_BASE = "https://api.procore.com";

export class ProcoreOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo" | "companies";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo" | "companies",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ProcoreOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateProcoreAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateProcoreAuthUrl(
  params: GenerateProcoreAuthUrlParams
): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeProcoreCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeProcoreCode(
  params: ExchangeProcoreCodeParams
): Promise<ProcoreOAuthResult> {
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
    throw new ProcoreOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = ProcoreTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchUserInfo(tokens.access_token);
  const company = await fetchFirstCompany(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: String(userInfo.id),
    userLogin: userInfo.login,
    userName: userInfo.name,
    companyId: String(company.id),
    companyName: company.name,
  };
}

export type RefreshProcoreTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshProcoreTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshProcoreToken(
  params: RefreshProcoreTokenParams
): Promise<RefreshProcoreTokenResult> {
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
    throw new ProcoreOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = ProcoreTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(accessToken: string) {
  const response = await fetch(`${PROCORE_API_BASE}/rest/v1.0/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ProcoreOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return ProcoreUserInfoSchema.parse(await response.json());
}

async function fetchFirstCompany(accessToken: string) {
  const response = await fetch(`${PROCORE_API_BASE}/rest/v1.0/companies`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ProcoreOAuthError(
      "companies",
      response.status,
      `Companies fetch failed: ${response.status}`
    );
  }

  const companies = (await response.json()) as unknown[];
  if (!Array.isArray(companies) || companies.length === 0) {
    throw new ProcoreOAuthError(
      "companies",
      404,
      "No companies found for this user"
    );
  }

  return ProcoreCompanySchema.parse(companies[0]);
}
