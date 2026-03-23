import { AuthType } from "../types";
import azureDevOpsApp from "./config";
import {
  type AzureDevOpsOAuthResult,
  AzureDevOpsProfileSchema,
  AzureDevOpsTokenResponseSchema,
} from "./types";

function getOAuthConfig() {
  if (azureDevOpsApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Azure DevOps app is not configured for OAuth2");
  }
  return azureDevOpsApp.auth.config;
}

export interface GenerateAzureDevOpsAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}

export function generateAzureDevOpsAuthUrl(
  params: GenerateAzureDevOpsAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "Assertion");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("redirect_uri", redirectUri);

  return url.toString();
}

export interface ExchangeAzureDevOpsCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeAzureDevOpsCode(
  params: ExchangeAzureDevOpsCodeParams
): Promise<AzureDevOpsOAuthResult> {
  const { clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Azure DevOps OAuth failed: ${res.status} - ${errorText}`);
  }

  const tokens = AzureDevOpsTokenResponseSchema.parse(await res.json());
  const profile = await fetchProfile(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: profile.id,
    userName: profile.displayName,
    userEmail: profile.emailAddress,
  };
}

export interface RefreshAzureDevOpsTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
}

export async function refreshAzureDevOpsToken(
  params: RefreshAzureDevOpsTokenParams
): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}> {
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: params.clientSecret,
      grant_type: "refresh_token",
      assertion: params.refreshToken,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Azure DevOps token refresh failed: ${res.status} - ${errorText}`
    );
  }

  const tokens = AzureDevOpsTokenResponseSchema.parse(await res.json());

  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
  };
}

async function fetchProfile(accessToken: string) {
  const res = await fetch(
    "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Azure DevOps profile: ${res.status}`);
  }

  return AzureDevOpsProfileSchema.parse(await res.json());
}
