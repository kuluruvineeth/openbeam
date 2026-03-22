import { z } from "zod";
import { AuthType } from "../types";
import asanaApp from "./config";
import {
  type AsanaOAuthResult,
  AsanaTokenResponseSchema,
  type AsanaWorkspace,
} from "./types";

function getOAuthConfig() {
  if (asanaApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Asana app is not configured for OAuth2");
  }
  return asanaApp.auth.config;
}

export type GenerateAsanaAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateAsanaAuthUrl(
  params: GenerateAsanaAuthUrlParams
): string {
  const config = getOAuthConfig();
  const url = new URL(config.authUrl);

  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);

  return url.toString();
}

export type ExchangeAsanaCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

const WorkspacesResponseSchema = z.object({
  data: z.array(
    z.object({
      gid: z.string(),
      name: z.string(),
    })
  ),
});

export async function exchangeAsanaCode(
  params: ExchangeAsanaCodeParams
): Promise<AsanaOAuthResult> {
  const config = getOAuthConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Asana OAuth token exchange failed: ${errorText}`);
  }

  const raw = await response.json();
  const tokens = AsanaTokenResponseSchema.parse(raw);

  const workspacesRes = await fetch(
    "https://app.asana.com/api/1.0/workspaces",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  );

  let workspaces: AsanaWorkspace[] = [];
  if (workspacesRes.ok) {
    const wsRaw = await workspacesRes.json();
    const parsed = WorkspacesResponseSchema.parse(wsRaw);
    workspaces = parsed.data;
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    expiresIn: tokens.expires_in,
    userGid: tokens.data?.gid ?? "",
    userName: tokens.data?.name ?? "",
    userEmail: tokens.data?.email ?? "",
    workspaces,
  };
}

export type RefreshAsanaTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export async function refreshAsanaToken(
  params: RefreshAsanaTokenParams
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const config = getOAuthConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Asana token refresh failed: ${errorText}`);
  }

  const raw = await response.json();
  const tokens = AsanaTokenResponseSchema.parse(raw);

  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
  };
}
