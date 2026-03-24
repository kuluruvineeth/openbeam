import { type MarketoAuthResult, MarketoTokenResponseSchema } from "./types";

export const MARKETO_TOKEN_LIFETIME_SECONDS = 3600;

export class MarketoOAuthError extends Error {
  readonly operation: "token" | "validate";
  readonly statusCode: number;

  constructor(
    operation: "token" | "validate",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "MarketoOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type ExchangeMarketoCredentialsParams = {
  munchkinId: string;
  clientId: string;
  clientSecret: string;
};

export async function exchangeMarketoCredentials(
  params: ExchangeMarketoCredentialsParams
): Promise<MarketoAuthResult> {
  const { munchkinId, clientId, clientSecret } = params;

  const tokenUrl = new URL(
    `https://${munchkinId}.mktorest.com/identity/oauth/token`
  );
  tokenUrl.searchParams.set("grant_type", "client_credentials");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new MarketoOAuthError(
      "token",
      response.status,
      `Marketo token exchange failed: ${errorText}`
    );
  }

  const data = MarketoTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    munchkinId,
  };
}

export function refreshMarketoToken(
  params: ExchangeMarketoCredentialsParams
): Promise<MarketoAuthResult> {
  return exchangeMarketoCredentials(params);
}
