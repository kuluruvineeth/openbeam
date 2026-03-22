import { AuthType } from "../types";
import clickUpApp from "./config";
import {
  type ClickUpAuthResult,
  ClickUpTokenResponseSchema,
  type ClickUpUser,
  ClickUpUserSchema,
  type ClickUpWorkspace,
  ClickUpWorkspaceSchema,
} from "./types";

const CLICKUP_API = "https://api.clickup.com/api/v2";

function getOAuthConfig() {
  if (clickUpApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("ClickUp app is not configured for OAuth2");
  }
  return clickUpApp.auth.config;
}

export interface GenerateClickUpAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateClickUpAuthUrl(
  params: GenerateClickUpAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export interface ExchangeClickUpCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
}

export async function exchangeClickUpCode(
  params: ExchangeClickUpCodeParams
): Promise<ClickUpAuthResult> {
  const { clientId, clientSecret, code } = params;
  const config = getOAuthConfig();

  const url = new URL(config.tokenUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ClickUp OAuth failed: ${res.status} - ${errorText}`);
  }

  const tokens = ClickUpTokenResponseSchema.parse(await res.json());
  const user = await fetchUser(tokens.access_token);
  const workspaces = await fetchWorkspaces(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    userId: user.id,
    userName: user.username ?? user.email,
    userEmail: user.email,
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
  };
}

async function fetchUser(accessToken: string): Promise<ClickUpUser> {
  const res = await fetch(`${CLICKUP_API}/user`, {
    headers: { Authorization: accessToken },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ClickUp user: ${res.status}`);
  }

  const json = (await res.json()) as { user: unknown };
  return ClickUpUserSchema.parse(json.user);
}

async function fetchWorkspaces(
  accessToken: string
): Promise<ClickUpWorkspace[]> {
  const res = await fetch(`${CLICKUP_API}/team`, {
    headers: { Authorization: accessToken },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ClickUp workspaces: ${res.status}`);
  }

  const json = (await res.json()) as { teams: unknown[] };
  return json.teams.map((t) => ClickUpWorkspaceSchema.parse(t));
}
