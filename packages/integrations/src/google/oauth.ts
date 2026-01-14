import type { OAuthConfig } from "../types";
import {
  type GoogleOAuthResult,
  TokenResponseSchema,
  UserInfoSchema,
} from "./types";

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export type GenerateGoogleAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  accessType?: "online" | "offline";
  prompt?: "none" | "consent" | "select_account";
};

export function generateGoogleAuthUrl(
  params: GenerateGoogleAuthUrlParams
): string {
  const {
    config,
    clientId,
    redirectUri,
    state,
    scopes,
    accessType = "offline",
    prompt = "consent",
  } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (scopes ?? config.scopes).join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", accessType);
  url.searchParams.set("prompt", prompt);

  return url.toString();
}

export type ExchangeGoogleCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export class GoogleOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "GoogleOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export async function exchangeGoogleCode(
  params: ExchangeGoogleCodeParams
): Promise<GoogleOAuthResult> {
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
    throw new GoogleOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = TokenResponseSchema.parse(await tokenResponse.json());

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new GoogleOAuthError(
      "userinfo",
      userInfoResponse.status,
      `User info fetch failed: ${userInfoResponse.status}`
    );
  }

  const user = UserInfoSchema.parse(await userInfoResponse.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope?.split(" ") ?? [],
    userEmail: user.email,
    userId: user.id,
    hostedDomain: user.hd,
  };
}

export type RefreshGoogleTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshGoogleTokenResult = {
  accessToken: string;
  expiresIn: number;
};

export async function refreshGoogleToken(
  params: RefreshGoogleTokenParams
): Promise<RefreshGoogleTokenResult> {
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
    throw new GoogleOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = TokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<{ id: string; email: string; hostedDomain?: string }> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new GoogleOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  const user = UserInfoSchema.parse(await response.json());

  return {
    id: user.id,
    email: user.email,
    hostedDomain: user.hd,
  };
}
