import { createHmac } from "node:crypto";
import logger from "@/utils/logger";

/**
 * Verify Slack signature (HMAC-SHA256)
 */
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  const requestTimestamp = Number.parseInt(timestamp, 10);

  // Check if request is too old
  if (requestTimestamp < fiveMinutesAgo) {
    return false;
  }

  // Calculate expected signature
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest("hex")}`;

  return signature === expectedSignature;
}
