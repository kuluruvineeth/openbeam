import { AuthType } from "../types";
import slackApp from "./config";
import { type SlackAuthResult, SlackOAuthResponseSchema } from "./types";

const getOAuthConfig = () => {
  if (slackApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Slack app is not configured for OAuth2");
  }
  return slackApp.auth.config;
};

export interface GenerateSlackAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}

export const generateSlackAuthUrl = (
  params: GenerateSlackAuthUrlParams
): string => {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  const scopeString = (scopes ?? config.scopes).join(",");

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopeString);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
};

export interface ExchangeSlackCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export const exchangeSlackCode = async (
  params: ExchangeSlackCodeParams
): Promise<SlackAuthResult> => {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const formData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }

  const data = await response.json();
  const result = SlackOAuthResponseSchema.parse(data);

  if (result.ok === false || result.error) {
    throw new Error(`Slack OAuth failed: ${result.error || "Unknown error"}`);
  }

  if (
    result.access_token === undefined ||
    result.team === undefined ||
    result.bot_user_id === undefined
  ) {
    throw new Error("Slack OAuth response missing required fields");
  }

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    scopes: result.scope?.split(",") ?? [],
    teamId: result.team.id,
    teamName: result.team.name,
    botUserId: result.bot_user_id,
  };
};
