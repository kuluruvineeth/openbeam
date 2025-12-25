import * as jose from "jose";

const GOOGLE_JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const VALID_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

type VerifyResult =
  | { valid: true; email: string }
  | { valid: false; reason: string };

export async function verifyPubSubToken(
  authHeader: string | undefined
): Promise<VerifyResult> {
  const audience = process.env.PUBSUB_AUDIENCE;
  if (!audience) {
    return { valid: false, reason: "pubsub_not_configured" };
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, reason: "missing_token" };
  }

  try {
    const { payload } = await jose.jwtVerify(authHeader.slice(7), GOOGLE_JWKS, {
      audience,
      issuer: VALID_ISSUERS,
    });

    if (typeof payload.email !== "string") {
      return { valid: false, reason: "missing_email_claim" };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false, reason: "invalid_token" };
  }
}
