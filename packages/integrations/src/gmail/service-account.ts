import * as crypto from "node:crypto";
import {
  type ServiceAccountCredentials,
  type ServiceAccountResult,
  TokenResponseSchema,
} from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GMAIL_SERVICE_ACCOUNT_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
];

export type GetServiceAccountTokenParams = {
  credentials: ServiceAccountCredentials;
  delegatedUserEmail: string;
  scopes?: string[];
};

export async function getServiceAccountToken(
  params: GetServiceAccountTokenParams
): Promise<ServiceAccountResult> {
  const {
    credentials,
    delegatedUserEmail,
    scopes = GMAIL_SERVICE_ACCOUNT_SCOPES,
  } = params;

  const jwt = createJWT(credentials, delegatedUserEmail, scopes);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Service account auth failed: ${await res.text()}`);
  }

  const data = TokenResponseSchema.parse(await res.json());

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    serviceAccountEmail: credentials.client_email,
    delegatedUserEmail,
    projectId: credentials.project_id,
  };
}

function createJWT(
  credentials: ServiceAccountCredentials,
  subject: string,
  scopes: string[]
): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.private_key_id,
  };

  const payload = {
    iss: credentials.client_email,
    sub: subject,
    scope: scopes.join(" "),
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signRS256(signatureInput, credentials.private_key);

  return `${signatureInput}.${signature}`;
}

function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function signRS256(data: string, privateKey: string): string {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  return signer
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
