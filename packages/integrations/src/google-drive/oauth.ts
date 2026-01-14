import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import googleDriveApp from "./config";

function getOAuthConfig() {
  if (googleDriveApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Google Drive app is not configured for OAuth2");
  }
  return googleDriveApp.auth.config;
}

export type GenerateGoogleDriveAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGoogleDriveAuthUrl(
  params: GenerateGoogleDriveAuthUrlParams
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

export type ExchangeGoogleDriveCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeGoogleDriveCode(
  params: ExchangeGoogleDriveCodeParams
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

export type RefreshGoogleDriveTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshGoogleDriveToken(
  params: RefreshGoogleDriveTokenParams
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
