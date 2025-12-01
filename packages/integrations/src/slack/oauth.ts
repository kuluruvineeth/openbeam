import { AuthType } from "../types";
import slackApp from "./config";
import { type SlackAuthResult, SlackOAuthResponseSchema } from "./types";

function getOAuthConfig() {
  if (slackApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Slack app is not configured for OAuth2");
  }
  return slackApp.auth.config;
}

export const SLACK_USER_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "search:read",
  "users:read",
  "users:read.email",
  "files:read",
] as const;

export type GenerateSlackAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  userScopes?: string[];
};

export function generateSlackAuthUrl(
  params: GenerateSlackAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes, userScopes } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", (scopes ?? config.scopes).join(","));
  url.searchParams.set(
    "user_scope",
    (userScopes ?? SLACK_USER_SCOPES).join(",")
  );
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeSlackCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeSlackCode(
  params: ExchangeSlackCodeParams
): Promise<SlackAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Slack OAuth failed: ${res.status}`);
  }

  const result = SlackOAuthResponseSchema.parse(await res.json());

  if (!result.ok || result.error) {
    throw new Error(`Slack OAuth failed: ${result.error ?? "Unknown error"}`);
  }

  if (!(result.access_token && result.team && result.bot_user_id)) {
    throw new Error("Slack OAuth response missing required fields");
  }

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    scopes: result.scope?.split(",") ?? [],
    teamId: result.team.id,
    teamName: result.team.name,
    botUserId: result.bot_user_id,
    syncAccessToken: result.authed_user?.access_token,
    syncScopes: result.authed_user?.scope?.split(",").filter(Boolean),
    syncAuthedUserId: result.authed_user?.id,
  };
}
