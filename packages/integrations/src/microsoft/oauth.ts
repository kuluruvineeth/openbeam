import type { OAuthConfig } from "../types";
import {
  type MicrosoftOAuthResult,
  MicrosoftTokenResponseSchema,
  MicrosoftUserInfoSchema,
} from "./types";

const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

export type GenerateMicrosoftAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  responseMode?: "query" | "fragment" | "form_post";
  prompt?: "login" | "consent" | "select_account" | "none";
};

export function generateMicrosoftAuthUrl(
  params: GenerateMicrosoftAuthUrlParams
): string {
  const {
    config,
    clientId,
    redirectUri,
    state,
    scopes,
    responseMode = "query",
    prompt = "consent",
  } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("response_mode", responseMode);
  url.searchParams.set("prompt", prompt);

  return url.toString();
}

export type ExchangeMicrosoftCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export class MicrosoftOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "MicrosoftOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export async function exchangeMicrosoftCode(
  params: ExchangeMicrosoftCodeParams
): Promise<MicrosoftOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new MicrosoftOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = MicrosoftTokenResponseSchema.parse(await tokenResponse.json());

  const userInfoResponse = await fetch(MICROSOFT_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new MicrosoftOAuthError(
      "userinfo",
      userInfoResponse.status,
      `User info fetch failed: ${userInfoResponse.status}`
    );
  }

  const user = MicrosoftUserInfoSchema.parse(await userInfoResponse.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope?.split(" ") ?? [],
    userEmail: user.mail ?? user.userPrincipalName,
    userId: user.id,
    displayName: user.displayName ?? undefined,
  };
}

export type RefreshMicrosoftTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshMicrosoftTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
};

export async function refreshMicrosoftToken(
  params: RefreshMicrosoftTokenParams
): Promise<RefreshMicrosoftTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new MicrosoftOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = MicrosoftTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

export async function fetchMicrosoftUserInfo(
  accessToken: string
): Promise<{ id: string; email: string; displayName?: string }> {
  const response = await fetch(MICROSOFT_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new MicrosoftOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  const user = MicrosoftUserInfoSchema.parse(await response.json());

  return {
    id: user.id,
    email: user.mail ?? user.userPrincipalName,
    displayName: user.displayName ?? undefined,
  };
}
