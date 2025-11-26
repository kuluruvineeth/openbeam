/**
 * Slack OAuth Implementation
 * Uses shared OAuth utilities with Slack-specific configuration
 */

import {
  buildAuthUrl,
  exchangeCode,
  generateStateToken,
  type OAuthCredentials,
} from "../oauth";
import { slackOAuthConfig } from "./config";
import { SlackOAuthResponseSchema } from "./types";

export type SlackAuthResult = {
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  teamId: string;
  teamName: string;
  botUserId: string;
  appId?: string;
  authedUser?: {
    id: string;
    accessToken?: string;
    scope?: string;
  };
};

export type GenerateSlackAuthUrlParams = {
  credentials: OAuthCredentials;
  redirectUri: string;
  state?: string;
  scopes?: string[];
  teamId?: string; // Pre-select a workspace
  userScope?: string[]; // Request user token scopes
};

/**
 * Generate Slack OAuth authorization URL
 */
export function generateSlackAuthUrl(params: GenerateSlackAuthUrlParams): {
  url: string;
  state: string;
} {
  const state = params.state || generateStateToken();

  const extraParams: Record<string, string> = {};

  // Slack-specific: pre-select workspace
  if (params.teamId) {
    extraParams.team = params.teamId;
  }

  // Slack-specific: user token scopes (for user impersonation)
  if (params.userScope?.length) {
    extraParams.user_scope = params.userScope.join(",");
  }

  const url = buildAuthUrl(slackOAuthConfig, {
    credentials: params.credentials,
    redirectUri: params.redirectUri,
    state,
    scopes: params.scopes,
    extraParams,
  });

  return { url, state };
}

export type ExchangeSlackCodeParams = {
  credentials: OAuthCredentials;
  code: string;
  redirectUri: string;
};

/**
 * Exchange Slack authorization code for tokens
 * Returns structured result with team info
 */
export async function exchangeSlackCode(
  params: ExchangeSlackCodeParams
): Promise<SlackAuthResult> {
  const tokens = await exchangeCode(slackOAuthConfig, params);

  // Parse Slack-specific response
  const result = SlackOAuthResponseSchema.parse(tokens.raw);

  if (!result.ok || result.error) {
    throw new Error(`Slack OAuth failed: ${result.error || "Unknown error"}`);
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
    appId: result.app_id,
    authedUser: result.authed_user
      ? {
          id: result.authed_user.id,
          accessToken: result.authed_user.access_token,
          scope: result.authed_user.scope,
        }
      : undefined,
  };
}

/**
 * Get credentials from environment
 */
export function getSlackCredentials(): OAuthCredentials | null {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }

  return { clientId, clientSecret };
}

// Re-export for convenience
export { generateStateToken };
