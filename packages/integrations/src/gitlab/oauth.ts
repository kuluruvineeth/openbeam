import { GITLAB_DEFAULT_URL } from "@openbeam/types/services/connectors/gitlab";
import { AuthType } from "../types";
import gitlabApp from "./config";
import {
  type GitLabAuthResult,
  type GitLabTokenResponse,
  GitLabTokenResponseSchema,
  GitLabUserInfoSchema,
} from "./types";

function getOAuthConfig() {
  if (gitlabApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("GitLab app is not configured for OAuth2");
  }
  return gitlabApp.auth.config;
}

export interface GenerateGitLabAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  instanceUrl?: string;
  scopes?: string[];
}

export function generateGitLabAuthUrl(
  params: GenerateGitLabAuthUrlParams
): string {
  const { clientId, redirectUri, state, instanceUrl, scopes } = params;
  const config = getOAuthConfig();
  const baseUrl = instanceUrl || GITLAB_DEFAULT_URL;

  const url = new URL(`${baseUrl}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  return url.toString();
}

export interface ExchangeGitLabCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  instanceUrl?: string;
}

export async function exchangeGitLabCode(
  params: ExchangeGitLabCodeParams
): Promise<GitLabAuthResult> {
  const { clientId, clientSecret, code, redirectUri, instanceUrl } = params;
  const baseUrl = instanceUrl || GITLAB_DEFAULT_URL;

  const tokenResponse = await requestToken(`${baseUrl}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  return hydrateAuthResult(tokenResponse, baseUrl);
}

export interface RefreshGitLabTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  instanceUrl?: string;
}

export async function refreshGitLabToken(
  params: RefreshGitLabTokenParams
): Promise<GitLabAuthResult> {
  const { clientId, clientSecret, refreshToken, instanceUrl } = params;
  const baseUrl = instanceUrl || GITLAB_DEFAULT_URL;

  const tokenResponse = await requestToken(`${baseUrl}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return hydrateAuthResult(tokenResponse, baseUrl);
}

async function requestToken(
  tokenUrl: string,
  body: Record<string, string>
): Promise<GitLabTokenResponse> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitLab OAuth failed: ${response.status} - ${errorText}`);
  }

  return GitLabTokenResponseSchema.parse(await response.json());
}

async function hydrateAuthResult(
  tokenResponse: GitLabTokenResponse,
  baseUrl: string
): Promise<GitLabAuthResult> {
  const user = await fetchUser(tokenResponse.access_token, baseUrl);

  const scopes =
    tokenResponse.scope
      ?.split(" ")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    scopes,
    userId: String(user.id),
    username: user.username,
    userName: user.name,
    userEmail: user.email ?? undefined,
    avatarUrl: user.avatar_url ?? undefined,
    profileUrl: user.web_url,
  };
}

async function fetchUser(accessToken: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/v4/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitLab user: ${response.status}`);
  }

  return GitLabUserInfoSchema.parse(await response.json());
}
