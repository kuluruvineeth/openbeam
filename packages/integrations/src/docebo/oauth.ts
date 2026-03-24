import { type DoceboAuthResult, DoceboTokenResponseSchema } from "./types";

const TRAILING_SLASHES = /\/+$/;

export const DOCEBO_TOKEN_LIFETIME_SECONDS = 3600;

export class DoceboOAuthError extends Error {
  readonly operation: "token" | "validate";
  readonly statusCode: number;

  constructor(
    operation: "token" | "validate",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "DoceboOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type ExchangeDoceboCredentialsParams = {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
};

export async function exchangeDoceboCredentials(
  params: ExchangeDoceboCredentialsParams
): Promise<DoceboAuthResult> {
  const { instanceUrl, clientId, clientSecret } = params;

  const baseUrl = instanceUrl.replace(TRAILING_SLASHES, "");
  const tokenUrl = `${baseUrl}/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "api",
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
    throw new DoceboOAuthError(
      "token",
      response.status,
      `Docebo token exchange failed: ${errorText}`
    );
  }

  const data = DoceboTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    instanceUrl: baseUrl,
  };
}

export function refreshDoceboToken(
  params: ExchangeDoceboCredentialsParams
): Promise<DoceboAuthResult> {
  return exchangeDoceboCredentials(params);
}
