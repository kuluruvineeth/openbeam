import { AuthType } from "../types";
import bitbucketApp from "./config";
import {
  type BitbucketAuthResult,
  type BitbucketTokenResponse,
  BitbucketTokenResponseSchema,
  BitbucketUserInfoSchema,
} from "./types";

const BITBUCKET_API = "https://api.bitbucket.org/2.0";

function getOAuthConfig() {
  if (bitbucketApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Bitbucket app is not configured for OAuth2");
  }
  return bitbucketApp.auth.config;
}

export interface GenerateBitbucketAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateBitbucketAuthUrl(
  params: GenerateBitbucketAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export interface ExchangeBitbucketCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeBitbucketCode(
  params: ExchangeBitbucketCodeParams
): Promise<BitbucketAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const tokenResponse = await requestToken(
    config.tokenUrl,
    clientId,
    clientSecret,
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }
  );

  return hydrateAuthResult(tokenResponse);
}

export interface RefreshBitbucketTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshBitbucketToken(
  params: RefreshBitbucketTokenParams
): Promise<BitbucketAuthResult> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  const tokenResponse = await requestToken(
    config.tokenUrl,
    clientId,
    clientSecret,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }
  );

  return hydrateAuthResult(tokenResponse);
}

async function requestToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  body: Record<string, string>
): Promise<BitbucketTokenResponse> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Bitbucket OAuth failed: ${response.status} - ${errorText}`
    );
  }

  return BitbucketTokenResponseSchema.parse(await response.json());
}

async function hydrateAuthResult(
  tokenResponse: BitbucketTokenResponse
): Promise<BitbucketAuthResult> {
  const user = await fetchUser(tokenResponse.access_token);

  const scopes =
    tokenResponse.scopes
      ?.split(" ")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    scopes,
    userId: user.uuid,
    displayName: user.display_name,
    nickname: user.nickname,
    avatarUrl: user.links?.avatar?.href,
    profileUrl: user.links?.html?.href,
  };
}

async function fetchUser(accessToken: string) {
  const response = await fetch(`${BITBUCKET_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Bitbucket user: ${response.status}`);
  }

  return BitbucketUserInfoSchema.parse(await response.json());
}
