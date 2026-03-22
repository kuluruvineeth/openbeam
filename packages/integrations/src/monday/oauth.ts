import { AuthType } from "../types";
import mondayApp from "./config";
import {
  type MondayAuthResult,
  type MondayMe,
  MondayMeSchema,
  MondayTokenResponseSchema,
} from "./types";

const MONDAY_API = "https://api.monday.com/v2";

function getOAuthConfig() {
  if (mondayApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Monday app is not configured for OAuth2");
  }
  return mondayApp.auth.config;
}

export interface GenerateMondayAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateMondayAuthUrl(
  params: GenerateMondayAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export interface ExchangeMondayCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeMondayCode(
  params: ExchangeMondayCodeParams
): Promise<MondayAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Monday OAuth failed: ${res.status} - ${errorText}`);
  }

  const tokens = MondayTokenResponseSchema.parse(await res.json());
  const me = await fetchMe(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    userId: me.id,
    userName: me.name,
    userEmail: me.email,
    accountId: me.account.id,
    accountName: me.account.name,
    accountSlug: me.account.slug,
  };
}

async function fetchMe(accessToken: string): Promise<MondayMe> {
  const query = `
    query {
      me {
        id
        name
        email
        photo_thumb_small
        account {
          id
          name
          slug
        }
      }
    }
  `;

  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Monday.com user: ${res.status}`);
  }

  const json = (await res.json()) as {
    errors?: Array<{ message: string }>;
    data?: { me: unknown };
  };

  const firstError = json.errors?.[0];
  if (firstError) {
    throw new Error(`Monday API error: ${firstError.message}`);
  }

  return MondayMeSchema.parse(json.data?.me);
}
