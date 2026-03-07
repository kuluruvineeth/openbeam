import crypto from "node:crypto";
import type { Database } from "@openbeam/db";
import { findConnectorById } from "@openbeam/db";
import type { VerifySignatureInput, VerifySignatureOutput } from "./types";

export interface VerifySignatureDependencies {
  db: Database;
}

export function createVerifySignatureActivity(
  deps: VerifySignatureDependencies
) {
  const { db } = deps;

  return async function verifySignature(
    input: VerifySignatureInput
  ): Promise<VerifySignatureOutput> {
    const connector = await findConnectorById(db, input.connectorId);

    if (!connector) {
      return { valid: false, reason: "Connector not found" };
    }

    if (!connector.webhookSecret) {
      return { valid: false, reason: "Webhook secret not configured" };
    }

    const payloadString =
      typeof input.payload === "string"
        ? input.payload
        : JSON.stringify(input.payload);

    const expectedSignature = crypto
      .createHmac("sha256", connector.webhookSecret)
      .update(payloadString)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(input.signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return { valid: false, reason: "Signature mismatch" };
    }

    return { valid: true };
  };
}
