import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import outlookApp from "./config";

function getOAuthConfig() {
  if (outlookApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Outlook app is not configured for OAuth2");
  }
  return outlookApp.auth.config;
}

export type GenerateOutlookAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateOutlookAuthUrl(
  params: GenerateOutlookAuthUrlParams
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

export type ExchangeOutlookCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeOutlookCode(
  params: ExchangeOutlookCodeParams
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

export type RefreshOutlookTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshOutlookToken(
  params: RefreshOutlookTokenParams
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

export type { MicrosoftOAuthResult as OutlookOAuthResult };
