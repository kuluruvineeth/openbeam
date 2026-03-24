import type { OAuthConfig } from "../types";
import type { EgnyteOAuthResult } from "./types";
import { EgnyteTokenResponseSchema, EgnyteUserInfoSchema } from "./types";

export class EgnyteOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "user";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "user",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "EgnyteOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateEgnyteAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  domain: string;
};

export function generateEgnyteAuthUrl(
  params: GenerateEgnyteAuthUrlParams
): string {
  const { clientId, redirectUri, state, domain } = params;

  const url = new URL(`https://${domain}.egnyte.com/puboauth/token`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "Egnyte.filesystem Egnyte.link Egnyte.user");
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

export type ExchangeEgnyteCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  domain: string;
};

export async function exchangeEgnyteCode(
  params: ExchangeEgnyteCodeParams
): Promise<EgnyteOAuthResult> {
  const { clientId, clientSecret, code, redirectUri, domain } = params;

  const tokenResponse = await fetch(
    `https://${domain}.egnyte.com/puboauth/token`,
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
    throw new EgnyteOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = EgnyteTokenResponseSchema.parse(await tokenResponse.json());
  const userInfo = await fetchEgnyteUserInfo(tokens.access_token, domain);

  return {
    accessToken: tokens.access_token,
    userId: String(userInfo.id),
    userEmail: userInfo.email,
    displayName: `${userInfo.first_name} ${userInfo.last_name}`.trim(),
    domain,
  };
}

async function fetchEgnyteUserInfo(accessToken: string, domain: string) {
  const response = await fetch(
    `https://${domain}.egnyte.com/pubapi/v1/userinfo`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new EgnyteOAuthError(
      "user",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return EgnyteUserInfoSchema.parse(await response.json());
}
