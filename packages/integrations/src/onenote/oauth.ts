import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import onenoteApp from "./config";

function getOAuthConfig() {
  if (onenoteApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("OneNote app is not configured for OAuth2");
  }
  return onenoteApp.auth.config;
}

export type GenerateOneNoteAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateOneNoteAuthUrl(
  params: GenerateOneNoteAuthUrlParams
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

export type ExchangeOneNoteCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeOneNoteCode(
  params: ExchangeOneNoteCodeParams
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

export type RefreshOneNoteTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshOneNoteToken(
  params: RefreshOneNoteTokenParams
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

export type { MicrosoftOAuthResult as OneNoteOAuthResult };
