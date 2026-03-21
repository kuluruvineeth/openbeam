import {
  type ServiceNowOAuthResult,
  ServiceNowTokenResponseSchema,
  ServiceNowUserSchema,
} from "./types";

export class ServiceNowOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ServiceNowOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateServiceNowAuthUrlParams = {
  instance: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateServiceNowAuthUrl(
  params: GenerateServiceNowAuthUrlParams
): string {
  const { instance, clientId, redirectUri, state, scopes } = params;

  const url = new URL(`https://${instance}.service-now.com/oauth_auth.do`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", (scopes ?? ["useraccount"]).join(" "));

  return url.toString();
}

export type ExchangeServiceNowCodeParams = {
  instance: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeServiceNowCode(
  params: ExchangeServiceNowCodeParams
): Promise<ServiceNowOAuthResult> {
  const { instance, clientId, clientSecret, code, redirectUri } = params;

  const tokenUrl = `https://${instance}.service-now.com/oauth_token.do`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new ServiceNowOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = ServiceNowTokenResponseSchema.parse(
    await tokenResponse.json()
  );

  const userInfo = await fetchServiceNowCurrentUser(
    tokens.access_token,
    instance
  );

  const displayParts = [
    userInfo.result.first_name,
    userInfo.result.last_name,
  ].filter(Boolean);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    userId: userInfo.result.user_sys_id,
    userEmail: userInfo.result.email,
    displayName: displayParts.join(" ") || userInfo.result.user_name,
  };
}

export type RefreshServiceNowTokenParams = {
  instance: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type RefreshServiceNowTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function refreshServiceNowToken(
  params: RefreshServiceNowTokenParams
): Promise<RefreshServiceNowTokenResult> {
  const { instance, clientId, clientSecret, refreshToken } = params;

  const tokenUrl = `https://${instance}.service-now.com/oauth_token.do`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ServiceNowOAuthError(
      "refresh",
      response.status,
      `Token refresh failed: ${errorText}`
    );
  }

  const tokens = ServiceNowTokenResponseSchema.parse(await response.json());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

async function fetchServiceNowCurrentUser(
  accessToken: string,
  instance: string
): Promise<{
  result: {
    user_name: string;
    user_sys_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}> {
  const response = await fetch(
    `https://${instance}.service-now.com/api/now/ui/user/current_user`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new ServiceNowOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  return ServiceNowUserSchema.parse(await response.json());
}
