/**
 * Shared OAuth Utilities
 * Generic functions that work across all OAuth providers
 */

import { randomBytes } from "node:crypto";
import type {
  ExchangeCodeParams,
  GenerateAuthUrlParams,
  OAuthConfig,
  OAuthTokens,
  RefreshTokenParams,
} from "./types";

/**
 * Generate a cryptographically secure state token for CSRF protection
 */
export function generateStateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a PKCE code verifier and challenge
 * Used by some OAuth providers for enhanced security
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  // For S256 challenge, we'd need to hash it, but plain is simpler
  return { verifier, challenge: verifier };
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(
  config: OAuthConfig,
  params: GenerateAuthUrlParams
): string {
  const { credentials, redirectUri, state, scopes, extraParams } = params;
  const delimiter = config.scopeDelimiter || " ";
  const scopeString = (scopes || config.scopes).join(delimiter);

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  if (scopeString) {
    url.searchParams.set("scope", scopeString);
  }

  // Add any extra provider-specific params
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(
  config: OAuthConfig,
  params: ExchangeCodeParams,
  options?: {
    useBasicAuth?: boolean;
    extraBody?: Record<string, string>;
  }
): Promise<OAuthTokens> {
  const { credentials, code, redirectUri } = params;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    ...(options?.extraBody || {}),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // Some providers prefer Basic auth, others want credentials in body
  if (options?.useBasicAuth) {
    const basic = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  } else {
    body.set("client_id", credentials.clientId);
    body.set("client_secret", credentials.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
    tokenType: data.token_type,
    scope: data.scope,
    raw: data,
  };
}

/**
 * Refresh an access token
 */
export async function refreshToken(
  config: OAuthConfig,
  params: RefreshTokenParams,
  options?: {
    useBasicAuth?: boolean;
  }
): Promise<OAuthTokens> {
  const { credentials, refreshToken: token } = params;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (options?.useBasicAuth) {
    const basic = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  } else {
    body.set("client_id", credentials.clientId);
    body.set("client_secret", credentials.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || token, // Some providers don't return new refresh token
    expiresIn: data.expires_in,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
    tokenType: data.token_type,
    scope: data.scope,
    raw: data,
  };
}

/**
 * Check if a token is expired or about to expire
 */
export function isTokenExpired(expiresAt?: Date, bufferSeconds = 300): boolean {
  if (!expiresAt) return false;
  return new Date() >= new Date(expiresAt.getTime() - bufferSeconds * 1000);
}
