import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import teamsApp from "./config";

function getOAuthConfig() {
  if (teamsApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Teams app is not configured for OAuth2");
  }
  return teamsApp.auth.config;
}

export type GenerateTeamsAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateTeamsAuthUrl(
  params: GenerateTeamsAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  return generateMicrosoftAuthUrl({
    config,
    clientId,
    redirectUri,
    state,
    scopes,
  });
}

export type ExchangeTeamsCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeTeamsCode(
  params: ExchangeTeamsCodeParams
): Promise<MicrosoftOAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  return exchangeMicrosoftCode({
    config,
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
}

export type RefreshTeamsTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshTeamsToken(
  params: RefreshTeamsTokenParams
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  return refreshMicrosoftToken({
    config,
    clientId,
    clientSecret,
    refreshToken,
  });
}

export type { MicrosoftOAuthResult as TeamsOAuthResult };
