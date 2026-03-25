import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import lookerStudioApp from "./config";

function getOAuthConfig() {
  if (lookerStudioApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Looker Studio app is not configured for OAuth2");
  }
  return lookerStudioApp.auth.config;
}

export type GenerateLookerStudioAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateLookerStudioAuthUrl(
  params: GenerateLookerStudioAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  return generateGoogleAuthUrl({
    config,
    clientId,
    redirectUri,
    state,
    scopes,
  });
}

export type ExchangeLookerStudioCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeLookerStudioCode(
  params: ExchangeLookerStudioCodeParams
): Promise<GoogleOAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  return exchangeGoogleCode({
    config,
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
}

export type RefreshLookerStudioTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshLookerStudioToken(
  params: RefreshLookerStudioTokenParams
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  return refreshGoogleToken({
    config,
    clientId,
    clientSecret,
    refreshToken,
  });
}

export type { GoogleOAuthResult as OAuthResult };
