import {
  type AtlassianOAuthResult,
  exchangeAtlassianCode,
  generateAtlassianAuthUrl,
  refreshAtlassianToken,
} from "../atlassian";
import { AuthType } from "../types";
import jiraApp from "./config";

function getOAuthConfig() {
  if (jiraApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Jira app is not configured for OAuth2");
  }
  return jiraApp.auth.config;
}

export type GenerateJiraAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateJiraAuthUrl(params: GenerateJiraAuthUrlParams): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  return generateAtlassianAuthUrl({
    config,
    clientId,
    redirectUri,
    state,
    scopes,
  });
}

export type ExchangeJiraCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeJiraCode(
  params: ExchangeJiraCodeParams
): Promise<AtlassianOAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  return exchangeAtlassianCode({
    config,
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
}

export type RefreshJiraTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshJiraToken(
  params: RefreshJiraTokenParams
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  return refreshAtlassianToken({
    config,
    clientId,
    clientSecret,
    refreshToken,
  });
}

export type { AtlassianOAuthResult as JiraOAuthResult };
