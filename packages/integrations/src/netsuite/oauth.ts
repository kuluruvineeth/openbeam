import crypto from "node:crypto";

export class NetsuiteAuthError extends Error {
  readonly operation: "validate";
  readonly statusCode: number;

  constructor(operation: "validate", statusCode: number, message: string) {
    super(message);
    this.name = "NetsuiteAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type ValidateNetsuiteCredentialsParams = {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenKey: string;
  tokenSecret: string;
};

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function buildOAuth1Header(params: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  tokenKey: string;
  tokenSecret: string;
  accountId: string;
}): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_token: params.tokenKey,
    oauth_version: "1.0",
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k] ?? "")}`)
    .join("&");

  const baseString = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(params.tokenSecret)}`;

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;
  oauthParams.realm = params.accountId;

  const headerParts = Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

export async function validateNetsuiteCredentials(
  params: ValidateNetsuiteCredentialsParams
): Promise<{ accountId: string; accountName: string }> {
  const { accountId, consumerKey, consumerSecret, tokenKey, tokenSecret } =
    params;

  const accountSlug = accountId.toLowerCase().replace(/_/g, "-");
  const baseUrl = `https://${accountSlug}.suitetalk.api.netsuite.com/services/rest/record/v1/customer`;
  const url = `${baseUrl}?limit=1`;

  const authHeader = buildOAuth1Header({
    method: "GET",
    url: baseUrl,
    consumerKey,
    consumerSecret,
    tokenKey,
    tokenSecret,
    accountId,
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new NetsuiteAuthError(
      "validate",
      response.status,
      `NetSuite credential validation failed (${response.status}): ${body}`
    );
  }

  return {
    accountId,
    accountName: accountSlug,
  };
}
