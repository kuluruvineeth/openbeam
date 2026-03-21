import {
  exchangeGoogleCode,
  type GoogleOAuthResult,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "../google";
import { AuthType } from "../types";
import googleCalendarApp from "./config";

function getOAuthConfig() {
  if (googleCalendarApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Google Calendar app is not configured for OAuth2");
  }
  return googleCalendarApp.auth.config;
}

export type GenerateGoogleCalendarAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateGoogleCalendarAuthUrl(
  params: GenerateGoogleCalendarAuthUrlParams
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

export type ExchangeGoogleCalendarCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeGoogleCalendarCode(
  params: ExchangeGoogleCalendarCodeParams
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

export type RefreshGoogleCalendarTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshGoogleCalendarToken(
  params: RefreshGoogleCalendarTokenParams
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

export type { GoogleOAuthResult as GoogleCalendarOAuthResult };
