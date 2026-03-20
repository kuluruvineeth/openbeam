import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import sharePointApp from "./config";

function getOAuthConfig() {
  if (sharePointApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("SharePoint app is not configured for OAuth2");
  }
  return sharePointApp.auth.config;
}

export type GenerateSharePointAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateSharePointAuthUrl(
  params: GenerateSharePointAuthUrlParams
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

export type ExchangeSharePointCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeSharePointCode(
  params: ExchangeSharePointCodeParams
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

export type RefreshSharePointTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshSharePointToken(
  params: RefreshSharePointTokenParams
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

export type { MicrosoftOAuthResult as SharePointOAuthResult };
