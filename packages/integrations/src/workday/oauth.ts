import { type WorkdayOAuthResult, WorkdayTokenResponseSchema } from "./types";

export interface GenerateWorkdayAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  host: string;
  tenant: string;
}

export interface ExchangeWorkdayCodeParams {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  host: string;
  tenant: string;
}

export interface RefreshWorkdayTokenParams {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  host: string;
  tenant: string;
}

export class WorkdayOAuthError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "WorkdayOAuthError";
    this.statusCode = statusCode;
  }
}

export function generateWorkdayAuthUrl(
  params: GenerateWorkdayAuthUrlParams
): string {
  const { clientId, redirectUri, state, host } = params;
  const url = new URL(`https://${host}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "r:workers r:organizations");
  return url.toString();
}

export async function exchangeWorkdayCode(
  params: ExchangeWorkdayCodeParams
): Promise<WorkdayOAuthResult> {
  const { code, clientId, clientSecret, redirectUri, host, tenant } = params;
  const tokenUrl = `https://${host}/ccx/oauth2/${encodeURIComponent(tenant)}/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new WorkdayOAuthError(
      `Token exchange failed: ${response.status} ${text}`,
      response.status
    );
  }

  const raw: unknown = await response.json();
  const parsed = WorkdayTokenResponseSchema.parse(raw);

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token ?? "",
    expiresIn: parsed.expires_in,
    tenant,
    host,
  };
}

export async function refreshWorkdayToken(
  params: RefreshWorkdayTokenParams
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { refreshToken, clientId, clientSecret, host, tenant } = params;
  const tokenUrl = `https://${host}/ccx/oauth2/${encodeURIComponent(tenant)}/token`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new WorkdayOAuthError(
      `Token refresh failed: ${response.status} ${text}`,
      response.status
    );
  }

  const raw: unknown = await response.json();
  const parsed = WorkdayTokenResponseSchema.parse(raw);

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token ?? refreshToken,
    expiresIn: parsed.expires_in,
  };
}
