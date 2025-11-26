/**
 * Shared OAuth Types for all connectors
 */

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  raw: Record<string, unknown>;
};

export type OAuthConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter?: string; // Default: " " (space), Slack uses ","
};

export type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type GenerateAuthUrlParams = {
  credentials: OAuthCredentials;
  redirectUri: string;
  state: string;
  scopes?: string[];
  extraParams?: Record<string, string>;
};

export type ExchangeCodeParams = {
  credentials: OAuthCredentials;
  code: string;
  redirectUri: string;
};

export type RefreshTokenParams = {
  credentials: OAuthCredentials;
  refreshToken: string;
};

export type OAuthError = {
  error: string;
  errorDescription?: string;
  errorUri?: string;
};
