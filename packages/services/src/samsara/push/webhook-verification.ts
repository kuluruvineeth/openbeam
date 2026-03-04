import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "v1=";
const TIMESTAMP_TOLERANCE_SECONDS = 300;

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

export function verifySamsaraWebhook(
  payload: string,
  signature: string,
  timestamp: string,
  secretBase64: string
): WebhookVerificationResult {
  const ts = Number.parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return { valid: false, error: "Invalid timestamp" };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > TIMESTAMP_TOLERANCE_SECONDS) {
    return { valid: false, error: "Timestamp too old" };
  }

  const secret = Buffer.from(secretBase64, "base64");
  const message = `v1:${timestamp}:${payload}`;

  const expected = createHmac("sha256", secret).update(message).digest("hex");

  const sig = signature.startsWith(SIGNATURE_PREFIX)
    ? signature.slice(SIGNATURE_PREFIX.length)
    : signature;

  if (sig.length !== expected.length) {
    return { valid: false, error: "Signature mismatch" };
  }

  const valid = timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(expected, "hex")
  );

  return { valid, error: valid ? undefined : "Signature mismatch" };
}
