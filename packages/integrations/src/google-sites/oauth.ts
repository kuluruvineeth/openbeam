import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import googleSitesApp from "./config";

function getOAuthConfig() {
  if (googleSitesApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Google Sites app is not configured for OAuth2");
  }
  return googleSitesApp.auth.config;
}

export type GenerateGoogleSitesAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGoogleSitesAuthUrl(
  params: GenerateGoogleSitesAuthUrlParams
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

export type ExchangeGoogleSitesCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeGoogleSitesCode(
  params: ExchangeGoogleSitesCodeParams
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

export type RefreshGoogleSitesTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshGoogleSitesToken(
  params: RefreshGoogleSitesTokenParams
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
