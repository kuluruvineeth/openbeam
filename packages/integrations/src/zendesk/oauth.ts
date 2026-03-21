import {
  type ZendeskOAuthResult,
  ZendeskTokenResponseSchema,
  ZendeskUserSchema,
} from "./types";

export class ZendeskOAuthError extends Error {
  readonly operation: "exchange" | "refresh" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "refresh" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ZendeskOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateZendeskAuthUrlParams = {
  subdomain: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export function generateZendeskAuthUrl(
  params: GenerateZendeskAuthUrlParams
): string {
  const { subdomain, clientId, redirectUri, state, scopes } = params;

  const url = new URL(
    `https://${subdomain}.zendesk.com/oauth/authorizations/new`
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    (scopes ?? ["read", "tickets:read", "users:read", "hc:read"]).join(" ")
  );

  return url.toString();
}

export type ExchangeZendeskCodeParams = {
  subdomain: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

export async function exchangeZendeskCode(
  params: ExchangeZendeskCodeParams
): Promise<ZendeskOAuthResult> {
  const { subdomain, clientId, clientSecret, code, redirectUri } = params;

  const tokenUrl = `https://${subdomain}.zendesk.com/oauth/tokens`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      scope: "read tickets:read users:read hc:read",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new ZendeskOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = ZendeskTokenResponseSchema.parse(await tokenResponse.json());

  const userInfo = await fetchZendeskCurrentUser(
    tokens.access_token,
    subdomain
  );

  return {
    accessToken: tokens.access_token,
    userId: String(userInfo.id),
    userEmail: userInfo.email,
    displayName: userInfo.name,
    organizationId: userInfo.organization_id
      ? String(userInfo.organization_id)
      : undefined,
  };
}

async function fetchZendeskCurrentUser(
  accessToken: string,
  subdomain: string
): Promise<{
  id: number;
  email: string;
  name: string;
  organization_id?: number | null;
}> {
  const response = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/users/me.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new ZendeskOAuthError(
      "userinfo",
      response.status,
      `User info fetch failed: ${response.status}`
    );
  }

  const data = (await response.json()) as { user: unknown };
  return ZendeskUserSchema.parse(data.user);
}
