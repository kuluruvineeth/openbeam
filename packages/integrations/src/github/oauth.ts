import { AuthType } from "../types";
import githubApp from "./config";
import {
  type GitHubAuthResult,
  GitHubEmailSchema,
  type GitHubTokenResponse,
  GitHubTokenResponseSchema,
  GitHubUserSchema,
} from "./types";

const GITHUB_API = "https://api.github.com";

function getOAuthConfig() {
  if (githubApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("GitHub app is not configured for OAuth2");
  }
  return githubApp.auth.config;
}

export interface GenerateGitHubAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}

export function generateGitHubAuthUrl(
  params: GenerateGitHubAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

export interface ExchangeGitHubCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeGitHubCode(
  params: ExchangeGitHubCodeParams
): Promise<GitHubAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const tokenResponse = await requestToken(config.tokenUrl, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  return hydrateAuthResult(tokenResponse);
}

export interface RefreshGitHubTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshGitHubToken(
  params: RefreshGitHubTokenParams
): Promise<GitHubAuthResult> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  const tokenResponse = await requestToken(config.tokenUrl, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return hydrateAuthResult(tokenResponse);
}

async function requestToken(
  tokenUrl: string,
  body: Record<string, string>
): Promise<GitHubTokenResponse> {
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
    throw new Error(`GitHub OAuth failed: ${response.status} - ${errorText}`);
  }

  return GitHubTokenResponseSchema.parse(await response.json());
}

async function hydrateAuthResult(
  tokenResponse: GitHubTokenResponse
): Promise<GitHubAuthResult> {
  const user = await fetchUser(tokenResponse.access_token);
  const primaryEmail =
    user.email ?? (await fetchPrimaryEmail(tokenResponse.access_token));

  const scopes =
    tokenResponse.scope
      ?.split(",")
      .map((scope) => scope.trim())
      .filter(Boolean) ?? [];

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    scopes,
    userId: String(user.id),
    userLogin: user.login,
    userName: user.name ?? undefined,
    userEmail: primaryEmail ?? undefined,
    avatarUrl: user.avatar_url ?? undefined,
    profileUrl: user.html_url,
    accountType: user.type,
  };
}

async function fetchUser(accessToken: string) {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.status}`);
  }

  return GitHubUserSchema.parse(await response.json());
}

async function fetchPrimaryEmail(
  accessToken: string
): Promise<string | undefined> {
  const response = await fetch(`${GITHUB_API}/user/emails`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    return;
  }

  const emails = GitHubEmailSchema.array().safeParse(await response.json());
  if (!emails.success) {
    return;
  }

  return emails.data.find((email) => email.primary)?.email;
}
