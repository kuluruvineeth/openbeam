import { AuthType } from "../types";
import linearApp from "./config";
import {
  type LinearAuthResult,
  LinearTokenResponseSchema,
  type LinearViewer,
  LinearViewerSchema,
} from "./types";

const LINEAR_API = "https://api.linear.app/graphql";

function getOAuthConfig() {
  if (linearApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Linear app is not configured for OAuth2");
  }
  return linearApp.auth.config;
}

export interface GenerateLinearAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateLinearAuthUrl(
  params: GenerateLinearAuthUrlParams
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

export interface ExchangeLinearCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeLinearCode(
  params: ExchangeLinearCodeParams
): Promise<LinearAuthResult> {
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
    throw new Error(`Linear OAuth failed: ${res.status} - ${errorText}`);
  }

  const tokens = LinearTokenResponseSchema.parse(await res.json());
  const viewer = await fetchViewer(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: viewer.id,
    userName: viewer.name,
    userEmail: viewer.email,
    organizationId: viewer.organization.id,
    organizationName: viewer.organization.name,
    urlKey: viewer.organization.urlKey,
  };
}

export interface RefreshLinearTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshLinearToken(
  params: RefreshLinearTokenParams
): Promise<LinearAuthResult> {
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
    throw new Error(
      `Linear token refresh failed: ${res.status} - ${errorText}`
    );
  }

  const tokens = LinearTokenResponseSchema.parse(await res.json());
  const viewer = await fetchViewer(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: viewer.id,
    userName: viewer.name,
    userEmail: viewer.email,
    organizationId: viewer.organization.id,
    organizationName: viewer.organization.name,
    urlKey: viewer.organization.urlKey,
  };
}

async function fetchViewer(accessToken: string): Promise<LinearViewer> {
  const query = `
    query Viewer {
      viewer {
        id
        name
        email
        avatarUrl
        organization {
          id
          name
          urlKey
        }
      }
    }
  `;

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Linear viewer: ${res.status}`);
  }

  const json = (await res.json()) as {
    errors?: Array<{ message: string }>;
    data?: { viewer: unknown };
  };

  const firstError = json.errors?.[0];
  if (firstError) {
    throw new Error(`Linear API error: ${firstError.message}`);
  }

  return LinearViewerSchema.parse(json.data?.viewer);
}
