import type { OAuthConfig } from "../types";
import {
  DropboxAccountInfoSchema,
  type DropboxOAuthResult,
  DropboxTokenResponseSchema,
} from "./types";

export const DROPBOX_TOKEN_LIFETIME_SECONDS = 14_400;

export class DropboxOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "account";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "account",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "DropboxOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateDropboxAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateDropboxAuthUrl(
  params: GenerateDropboxAuthUrlParams
): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("token_access_type", "offline");

  return url.toString();
}

export type ExchangeDropboxCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeDropboxCode(
  params: ExchangeDropboxCodeParams
): Promise<DropboxOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new DropboxOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = DropboxTokenResponseSchema.parse(await tokenResponse.json());

  const accountInfo = await fetchDropboxAccountInfo(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    accountId: tokens.account_id,
    userEmail: accountInfo.email,
    displayName: accountInfo.name.display_name,
  };
}

export type RefreshDropboxTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshDropboxTokenResult = {
  accessToken: string;
  expiresIn: number;
};

export async function refreshDropboxToken(
  params: RefreshDropboxTokenParams
): Promise<RefreshDropboxTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new DropboxOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = DropboxTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function fetchDropboxAccountInfo(accessToken: string) {
  const response = await fetch(
    "https://api.dropboxapi.com/2/users/get_current_account",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "null",
    }
  );

  if (!response.ok) {
    throw new DropboxOAuthError(
      "account",
      response.status,
      `Account info fetch failed: ${response.status}`
    );
  }

  return DropboxAccountInfoSchema.parse(await response.json());
}
