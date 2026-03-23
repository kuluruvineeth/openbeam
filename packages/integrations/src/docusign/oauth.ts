import type { OAuthConfig } from "../types";
import {
  type DocuSignOAuthResult,
  DocuSignTokenResponseSchema,
  DocuSignUserInfoSchema,
} from "./types";

export const DOCUSIGN_TOKEN_LIFETIME_SECONDS = 3600;

const DOCUSIGN_AUTH_URLS = {
  demo: {
    authUrl: "https://account-d.docusign.com/oauth/auth",
    tokenUrl: "https://account-d.docusign.com/oauth/token",
    userInfoUrl: "https://account-d.docusign.com/oauth/userinfo",
  },
  production: {
    authUrl: "https://account.docusign.com/oauth/auth",
    tokenUrl: "https://account.docusign.com/oauth/token",
    userInfoUrl: "https://account.docusign.com/oauth/userinfo",
  },
} as const;

export type DocuSignEnvironment = "demo" | "production";

export class DocuSignOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "DocuSignOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

function getUrls(environment: DocuSignEnvironment) {
  return DOCUSIGN_AUTH_URLS[environment];
}

export type GenerateDocuSignAuthUrlParams = {
  config: OAuthConfig;
  clientId: string;
  redirectUri: string;
  state: string;
  environment?: DocuSignEnvironment;
};

export function generateDocuSignAuthUrl(
  params: GenerateDocuSignAuthUrlParams
): string {
  const {
    config,
    clientId,
    redirectUri,
    state,
    environment = "production",
  } = params;

  const urls = getUrls(environment);
  const url = new URL(urls.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scopes.join(" "));

  return url.toString();
}

export type ExchangeDocuSignCodeParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  environment?: DocuSignEnvironment;
};

export async function exchangeDocuSignCode(
  params: ExchangeDocuSignCodeParams
): Promise<DocuSignOAuthResult> {
  const {
    clientId,
    clientSecret,
    code,
    redirectUri,
    environment = "production",
  } = params;

  const urls = getUrls(environment);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const tokenResponse = await fetch(urls.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new DocuSignOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = DocuSignTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchUserInfo(urls.userInfoUrl, tokens.access_token);

  const defaultAccount =
    userInfo.accounts.find((a) => a.is_default) ?? userInfo.accounts[0];

  if (!defaultAccount) {
    throw new DocuSignOAuthError(
      "userinfo",
      200,
      "No DocuSign accounts found for user"
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.sub,
    userEmail: userInfo.email,
    userName: userInfo.name,
    accountId: defaultAccount.account_id,
    accountName: defaultAccount.account_name,
    baseUri: defaultAccount.base_uri,
  };
}

export type RefreshDocuSignTokenParams = {
  config: OAuthConfig;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  environment?: DocuSignEnvironment;
};

export type RefreshDocuSignTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export async function refreshDocuSignToken(
  params: RefreshDocuSignTokenParams
): Promise<RefreshDocuSignTokenResult> {
  const {
    clientId,
    clientSecret,
    refreshToken,
    environment = "production",
  } = params;

  const urls = getUrls(environment);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(urls.tokenUrl, {
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
    throw new DocuSignOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const data = DocuSignTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

async function fetchUserInfo(userInfoUrl: string, accessToken: string) {
  const response = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new DocuSignOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return DocuSignUserInfoSchema.parse(await response.json());
}
