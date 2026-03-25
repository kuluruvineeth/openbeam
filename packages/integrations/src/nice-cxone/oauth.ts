import {
  type NiceCxoneAuthResult,
  NiceCxoneTokenResponseSchema,
} from "./types";

const TRAILING_SLASHES = /\/+$/;

export const NICE_CXONE_TOKEN_LIFETIME_SECONDS = 3600;

export class NiceCxoneOAuthError extends Error {
  readonly operation: "token" | "validate";
  readonly statusCode: number;

  constructor(
    operation: "token" | "validate",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "NiceCxoneOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type ExchangeNiceCxoneCredentialsParams = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

export async function exchangeNiceCxoneCredentials(
  params: ExchangeNiceCxoneCredentialsParams
): Promise<NiceCxoneAuthResult> {
  const { baseUrl, clientId, clientSecret } = params;

  const cleanBase = baseUrl.replace(TRAILING_SLASHES, "");
  const tokenUrl = `${cleanBase}/auth/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
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
    throw new NiceCxoneOAuthError(
      "token",
      response.status,
      `NICE CXone token exchange failed: ${errorText}`
    );
  }

  const data = NiceCxoneTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    baseUrl: cleanBase,
  };
}

export function refreshNiceCxoneToken(
  params: ExchangeNiceCxoneCredentialsParams
): Promise<NiceCxoneAuthResult> {
  return exchangeNiceCxoneCredentials(params);
}
