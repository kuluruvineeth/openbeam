import {
  exchangeMicrosoftCode,
  generateMicrosoftAuthUrl,
  type MicrosoftOAuthResult,
  refreshMicrosoftToken,
} from "../microsoft";
import { AuthType } from "../types";
import dynamics365App from "./config";

const TRAILING_SLASHES = /\/+$/;

function getOAuthConfig() {
  if (dynamics365App.auth.type !== AuthType.OAUTH2) {
    throw new Error("Dynamics 365 app is not configured for OAuth2");
  }
  return dynamics365App.auth.config;
}

export type GenerateDynamics365AuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  orgUrl: string;
};

export function generateDynamics365AuthUrl(
  params: GenerateDynamics365AuthUrlParams
): string {
  const { clientId, redirectUri, state, orgUrl } = params;
  const config = getOAuthConfig();

  const normalizedOrgUrl = orgUrl.replace(TRAILING_SLASHES, "");
  const scopes = [
    `${normalizedOrgUrl}/user_impersonation`,
    "User.Read",
    "offline_access",
  ];

  return generateMicrosoftAuthUrl({
    config,
    clientId,
    redirectUri,
    state,
    scopes,
  });
}

export type ExchangeDynamics365CodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export function exchangeDynamics365Code(
  params: ExchangeDynamics365CodeParams
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

export type RefreshDynamics365TokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function refreshDynamics365Token(
  params: RefreshDynamics365TokenParams
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  return refreshMicrosoftToken({
    config,
    clientId,
    clientSecret,
    refreshToken,
  });
}

export type { MicrosoftOAuthResult as Dynamics365OAuthResult };
