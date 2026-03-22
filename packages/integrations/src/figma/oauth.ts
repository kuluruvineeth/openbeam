import { AuthType } from "../types";
import figmaApp from "./config";
import {
  type FigmaAuthResult,
  FigmaMeSchema,
  FigmaTokenResponseSchema,
} from "./types";

const FIGMA_API = "https://api.figma.com/v1";

function getOAuthConfig() {
  if (figmaApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Figma app is not configured for OAuth2");
  }
  return figmaApp.auth.config;
}

export interface GenerateFigmaAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateFigmaAuthUrl(
  params: GenerateFigmaAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("state", state);

  return url.toString();
}

export interface ExchangeFigmaCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeFigmaCode(
  params: ExchangeFigmaCodeParams
): Promise<FigmaAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
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

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Figma OAuth failed: ${res.status} - ${errorText}`);
  }

  const tokens = FigmaTokenResponseSchema.parse(await res.json());
  const me = await fetchMe(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: me.id,
    userEmail: me.email,
    userHandle: me.handle,
  };
}

export interface RefreshFigmaTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshFigmaToken(
  params: RefreshFigmaTokenParams
): Promise<FigmaAuthResult> {
  const { clientId, clientSecret, refreshToken } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Figma token refresh failed: ${res.status} - ${errorText}`);
  }

  const tokens = FigmaTokenResponseSchema.parse(await res.json());
  const me = await fetchMe(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: me.id,
    userEmail: me.email,
    userHandle: me.handle,
  };
}

async function fetchMe(
  accessToken: string
): Promise<{ id: string; email: string; handle: string }> {
  const res = await fetch(`${FIGMA_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Figma user: ${res.status}`);
  }

  return FigmaMeSchema.parse(await res.json());
}
