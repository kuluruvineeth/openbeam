import { type CoupaAuthResult, CoupaTokenResponseSchema } from "./types";

const TRAILING_SLASHES = /\/+$/;

export const COUPA_TOKEN_LIFETIME_SECONDS = 3600;

export class CoupaOAuthError extends Error {
  readonly operation: "token" | "validate";
  readonly statusCode: number;

  constructor(
    operation: "token" | "validate",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CoupaOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type ExchangeCoupaCredentialsParams = {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
};

export async function exchangeCoupaCredentials(
  params: ExchangeCoupaCredentialsParams
): Promise<CoupaAuthResult> {
  const { instanceUrl, clientId, clientSecret } = params;

  const baseUrl = instanceUrl.replace(TRAILING_SLASHES, "");
  const tokenUrl = `${baseUrl}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "core.read",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CoupaOAuthError(
      "token",
      response.status,
      `Coupa token exchange failed: ${errorText}`
    );
  }

  const data = CoupaTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    instanceUrl: baseUrl,
  };
}

export function refreshCoupaToken(
  params: ExchangeCoupaCredentialsParams
): Promise<CoupaAuthResult> {
  return exchangeCoupaCredentials(params);
}
