import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import googleChatApp from "./config";

function getOAuthConfig() {
  if (googleChatApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Google Chat app is not configured for OAuth2");
  }
  return googleChatApp.auth.config;
}

export type GenerateGoogleChatAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGoogleChatAuthUrl(
  params: GenerateGoogleChatAuthUrlParams
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

export type ExchangeGoogleChatCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeGoogleChatCode(
  params: ExchangeGoogleChatCodeParams
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

export type RefreshGoogleChatTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshGoogleChatToken(
  params: RefreshGoogleChatTokenParams
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

export type { GoogleOAuthResult as GoogleChatOAuthResult };
