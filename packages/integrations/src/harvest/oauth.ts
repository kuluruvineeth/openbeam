import type { OAuthConfig } from "../types";
import {
  type HarvestOAuthResult,
  HarvestTokenResponseSchema,
  HarvestUserInfoSchema,
} from "./types";

export const HARVEST_TOKEN_LIFETIME_SECONDS = 64_800;

export class HarvestOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HarvestOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateHarvestAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateHarvestAuthUrl(
  params: GenerateHarvestAuthUrlParams
): string {
  const { config, clientId, redirectUri, state } = params;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeHarvestCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeHarvestCode(
  params: ExchangeHarvestCodeParams
): Promise<HarvestOAuthResult> {
  const { config, clientId, clientSecret, code, redirectUri } = params;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new HarvestOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = HarvestTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchHarvestUserInfo(tokens.access_token);

  const account = userInfo.accounts[0];
  if (!account) {
    throw new HarvestOAuthError(
      "userinfo",
      422,
      "No Harvest accounts found for this user"
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: String(userInfo.user.id),
    userEmail: userInfo.user.email,
    userName: `${userInfo.user.first_name} ${userInfo.user.last_name}`.trim(),
    accountId: String(account.id),
    accountName: account.name,
  };
}

export type RefreshHarvestTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshHarvestTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshHarvestToken(
  params: RefreshHarvestTokenParams
): Promise<RefreshHarvestTokenResult> {
  const { config, clientId, clientSecret, refreshToken } = params;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HarvestOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = HarvestTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchHarvestUserInfo(accessToken: string) {
  const response = await fetch("https://id.getharvest.com/api/v2/accounts", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new HarvestOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return HarvestUserInfoSchema.parse(await response.json());
}
