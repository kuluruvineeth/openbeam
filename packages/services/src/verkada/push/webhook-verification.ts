import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

const MAX_TIMESTAMP_AGE_SECONDS = 60;

export function verifyVerkadaWebhook(
  payload: string,
  signatureHeader: string,
  secret: string
): WebhookVerificationResult {
  const pipeIndex = signatureHeader.indexOf("|");
  if (pipeIndex === -1) {
    return { valid: false, error: "Invalid signature format" };
  }

  const timestamp = signatureHeader.slice(0, pipeIndex);
  const signature = signatureHeader.slice(pipeIndex + 1);

  const timestampNum = Number(timestamp);
  if (Number.isNaN(timestampNum)) {
    return { valid: false, error: "Invalid timestamp" };
  }

  const age = Math.abs(Date.now() / 1000 - timestampNum);
  if (age > MAX_TIMESTAMP_AGE_SECONDS) {
    return { valid: false, error: "Timestamp too old" };
  }

  const message = `${payload}|${timestamp}`;
  const expected = createHmac("sha256", secret).update(message).digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: "Signature mismatch" };
  }

  const valid = timingSafeEqual(signatureBuffer, expectedBuffer);
  return { valid, error: valid ? undefined : "Signature mismatch" };
}
