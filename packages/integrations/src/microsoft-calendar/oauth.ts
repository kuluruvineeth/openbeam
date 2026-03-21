import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import microsoftCalendarApp from "./config";

function getOAuthConfig() {
  if (microsoftCalendarApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Microsoft Calendar app is not configured for OAuth2");
  }
  return microsoftCalendarApp.auth.config;
}

export type GenerateMicrosoftCalendarAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateMicrosoftCalendarAuthUrl(
  params: GenerateMicrosoftCalendarAuthUrlParams
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

export type ExchangeMicrosoftCalendarCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeMicrosoftCalendarCode(
  params: ExchangeMicrosoftCalendarCodeParams
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

export type RefreshMicrosoftCalendarTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshMicrosoftCalendarToken(
  params: RefreshMicrosoftCalendarTokenParams
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

export type { MicrosoftOAuthResult as MicrosoftCalendarOAuthResult };
