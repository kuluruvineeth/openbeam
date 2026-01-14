import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import gmailApp from "./config";

function getOAuthConfig() {
  if (gmailApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Gmail app is not configured for OAuth2");
  }
  return gmailApp.auth.config;
}

export type GenerateGmailAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGmailAuthUrl(
  params: GenerateGmailAuthUrlParams
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

export type ExchangeGmailCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeGmailCode(
  params: ExchangeGmailCodeParams
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

export type RefreshGmailTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshGmailToken(
  params: RefreshGmailTokenParams
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
