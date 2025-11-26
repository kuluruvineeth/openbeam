/**
 * Google OAuth Implementation
 */

import {
  buildAuthUrl,
  exchangeCode,
  generateStateToken,
  type OAuthCredentials,
  type OAuthTokens,
  refreshToken,
} from "../oauth";
import { googleOAuthConfig } from "./config";

export type GoogleAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
  name?: string;
  picture?: string;
};

export type GenerateGoogleAuthUrlParams = {
  credentials: OAuthCredentials;
  redirectUri: string;
  state?: string;
  scopes?: string[];
  loginHint?: string; // Pre-fill email
  prompt?: "none" | "consent" | "select_account";
};

/**
 * Generate Google OAuth authorization URL
 */
export function generateGoogleAuthUrl(params: GenerateGoogleAuthUrlParams): {
  url: string;
  state: string;
} {
  const state = params.state || generateStateToken();

  const extraParams: Record<string, string> = {
    access_type: "offline", // Get refresh token
    prompt: params.prompt || "consent", // Force consent to get refresh token
  };

  if (params.loginHint) {
    extraParams.login_hint = params.loginHint;
  }

  const url = buildAuthUrl(googleOAuthConfig, {
    credentials: params.credentials,
    redirectUri: params.redirectUri,
    state,
    scopes: params.scopes,
    extraParams,
  });

  return { url, state };
}

export type ExchangeGoogleCodeParams = {
  credentials: OAuthCredentials;
  code: string;
  redirectUri: string;
};

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCode(
  params: ExchangeGoogleCodeParams
): Promise<GoogleAuthResult> {
  const tokens = await exchangeCode(googleOAuthConfig, params);

  // Optionally fetch user info
  let userInfo: { email?: string; name?: string; picture?: string } = {};

  if (tokens.accessToken) {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }
      );
      if (response.ok) {
        userInfo = await response.json();
      }
    } catch {
      // User info is optional
    }
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(
  credentials: OAuthCredentials,
  refreshTokenValue: string
): Promise<OAuthTokens> {
  return refreshToken(googleOAuthConfig, {
    credentials,
    refreshToken: refreshTokenValue,
  });
}

/**
 * Get credentials from environment
 */
export function getGoogleCredentials(): OAuthCredentials | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }

  return { clientId, clientSecret };
}

export { generateStateToken };
