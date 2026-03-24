import type { OAuthConfig } from "../types";
import type { BynderOAuthResult } from "./types";
import { BynderCurrentUserSchema, BynderTokenResponseSchema } from "./types";

export class BynderOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "user";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "user",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "BynderOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateBynderAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  domain: string;
};

export function generateBynderAuthUrl(
  params: GenerateBynderAuthUrlParams
): string {
  const { clientId, redirectUri, state, domain } = params;

  const url = new URL(
    `https://${domain}.bynder.com/v6/authentication/oauth2/auth`
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "offline asset:read collection:read");
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeBynderCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  domain: string;
};

export async function exchangeBynderCode(
  params: ExchangeBynderCodeParams
): Promise<BynderOAuthResult> {
  const { clientId, clientSecret, code, redirectUri, domain } = params;

  const tokenResponse = await fetch(
    `https://${domain}.bynder.com/v6/authentication/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new BynderOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = BynderTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchBynderCurrentUser(tokens.access_token, domain);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.id,
    userEmail: userInfo.email,
    displayName: userInfo.name ?? userInfo.username ?? userInfo.email,
    domain,
  };
}

export type RefreshBynderTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  domain: string;
};

export async function refreshBynderToken(
  params: RefreshBynderTokenParams
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken, domain } = params;

  const response = await fetch(
    `https://${domain}.bynder.com/v6/authentication/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new BynderOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const tokens = BynderTokenResponseSchema.parse(await response.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

async function fetchBynderCurrentUser(accessToken: string, domain: string) {
  const response = await fetch(
    `https://${domain}.bynder.com/api/v4/currentuser/`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new BynderOAuthError(
      "user",
      response.status,
      `Current user fetch failed: ${response.status}`
    );
  }

  return BynderCurrentUserSchema.parse(await response.json());
}
