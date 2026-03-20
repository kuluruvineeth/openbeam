import {
  type AtlassianOAuthResult,
  exchangeAtlassianCode,
  generateAtlassianAuthUrl,
  refreshAtlassianToken,
} from "../atlassian";
import { AuthType } from "../types";
import confluenceApp from "./config";

function getOAuthConfig() {
  if (confluenceApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Confluence app is not configured for OAuth2");
  }
  return confluenceApp.auth.config;
}

export type GenerateConfluenceAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateConfluenceAuthUrl(
  params: GenerateConfluenceAuthUrlParams
): string {
  const { clientId, redirectUri, state, scopes } = params;
  const config = getOAuthConfig();

  return generateAtlassianAuthUrl({
    config,
    clientId,
    redirectUri,
    state,
    scopes,
  });
}

export type ExchangeConfluenceCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeConfluenceCode(
  params: ExchangeConfluenceCodeParams
): Promise<AtlassianOAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  return exchangeAtlassianCode({
    config,
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
}

export type RefreshConfluenceTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshConfluenceToken(
  params: RefreshConfluenceTokenParams
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  return refreshAtlassianToken({
    config,
    clientId,
    clientSecret,
    refreshToken,
  });
}

export type { AtlassianOAuthResult as ConfluenceOAuthResult };
