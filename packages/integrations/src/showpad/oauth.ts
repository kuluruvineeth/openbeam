import type { OAuthConfig } from "../types";
import type { ShowpadOAuthResult } from "./types";
import { ShowpadCurrentUserSchema, ShowpadTokenResponseSchema } from "./types";

export class ShowpadOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "user";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "user",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ShowpadOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateShowpadAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  subdomain: string;
};

export function generateShowpadAuthUrl(
  params: GenerateShowpadAuthUrlParams
): string {
  const { clientId, redirectUri, state, subdomain } = params;

  const url = new URL(
    `https://${subdomain}.showpad.biz/api/v3/oauth2/authorize`
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeShowpadCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  subdomain: string;
};

export async function exchangeShowpadCode(
  params: ExchangeShowpadCodeParams
): Promise<ShowpadOAuthResult> {
  const { clientId, clientSecret, code, redirectUri, subdomain } = params;

  const tokenResponse = await fetch(
    `https://${subdomain}.showpad.biz/api/v3/oauth2/token`,
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
    throw new ShowpadOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = ShowpadTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchShowpadCurrentUser(
    tokens.access_token,
    subdomain
  );

  const fullName = [userInfo.firstName, userInfo.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.id,
    userEmail: userInfo.email,
    displayName: fullName || userInfo.email,
    subdomain,
  };
}

export type RefreshShowpadTokenParams = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  subdomain: string;
};

export async function refreshShowpadToken(
  params: RefreshShowpadTokenParams
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken, subdomain } = params;

  const response = await fetch(
    `https://${subdomain}.showpad.biz/api/v3/oauth2/token`,
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
    throw new ShowpadOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const tokens = ShowpadTokenResponseSchema.parse(await response.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

async function fetchShowpadCurrentUser(accessToken: string, subdomain: string) {
  const response = await fetch(
    `https://${subdomain}.showpad.biz/api/v3/me.json`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new ShowpadOAuthError(
      "user",
      response.status,
      `Current user fetch failed: ${response.status}`
    );
  }

  const data = (await response.json()) as { response: unknown };
  return ShowpadCurrentUserSchema.parse(data.response);
}
