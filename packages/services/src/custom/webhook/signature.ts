import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  SignatureConfig,
  SignatureVerificationResult,
} from "@openbeam/types/services/connectors/custom-webhook";

const ALGORITHM_MAP: Record<string, string> = {
  "hmac-sha256": "sha256",
  "hmac-sha1": "sha1",
};

export function verifyCustomWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  config: SignatureConfig,
  secret: string
): SignatureVerificationResult {
  if (config.algorithm === "none") {
    return { valid: true };
  }

  const headerName = config.header.toLowerCase();
  const signatureHeader = headers[headerName];

  if (!signatureHeader) {
    return {
      valid: false,
      error: `Missing signature header: ${config.header}`,
    };
  }

  let receivedSignature = signatureHeader;

  if (config.prefix) {
    if (!receivedSignature.startsWith(config.prefix)) {
      return {
        valid: false,
        error: `Signature missing expected prefix: ${config.prefix}`,
      };
    }
    receivedSignature = receivedSignature.slice(config.prefix.length);
  }

  const algorithm = ALGORITHM_MAP[config.algorithm] ?? "sha256";
  const expected = createHmac(algorithm, secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(receivedSignature, "utf8");

  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, error: "Signature mismatch" };
  }

  const match = timingSafeEqual(expectedBuf, receivedBuf);
  return match
    ? { valid: true }
    : { valid: false, error: "Signature mismatch" };
}
