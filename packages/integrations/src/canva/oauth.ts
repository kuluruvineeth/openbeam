import type { OAuthConfig } from "../types";
import {
  type CanvaOAuthResult,
  CanvaTokenResponseSchema,
  CanvaUserProfileSchema,
} from "./types";

export const CANVA_TOKEN_LIFETIME_SECONDS = 14_400;

export class CanvaOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CanvaOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateCanvaAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

export function generateCanvaAuthUrl(
  params: GenerateCanvaAuthUrlParams
): string {
  const { config, clientId, redirectUri, state, codeChallenge } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (config.scopes?.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }

  return url.toString();
}

export type ExchangeCanvaCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

export async function exchangeCanvaCode(
  params: ExchangeCanvaCodeParams
): Promise<CanvaOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri, codeVerifier } =
    params;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new CanvaOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = CanvaTokenResponseSchema.parse(await tokenResponse.json());
  const profile = await fetchUserProfile(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: profile.user.id,
    displayName: profile.user.display_name,
    teamId: profile.team?.id,
    teamName: profile.team?.display_name,
  };
}

export type RefreshCanvaTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshCanvaTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshCanvaToken(
  params: RefreshCanvaTokenParams
): Promise<RefreshCanvaTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CanvaOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = CanvaTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserProfile(accessToken: string): Promise<{
  user: { id: string; display_name?: string };
  team?: { id: string; display_name?: string };
}> {
  const response = await fetch("https://api.canva.com/rest/v1/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new CanvaOAuthError(
      "userinfo",
      response.status,
      `User profile fetch failed: ${response.status}`
    );
  }

  return CanvaUserProfileSchema.parse(await response.json());
}
