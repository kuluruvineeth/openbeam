import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { verifySamsaraWebhook } from "../push/webhook-verification";

const TEST_SECRET_RAW = "test-webhook-secret-key-1234";
const TEST_SECRET_BASE64 = Buffer.from(TEST_SECRET_RAW).toString("base64");

function createValidSignature(
  payload: string,
  timestamp: string,
  secretBase64: string
): string {
  const secret = Buffer.from(secretBase64, "base64");
  const message = `v1:${timestamp}:${payload}`;
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  return `v1=${hmac}`;
}

describe("verifySamsaraWebhook", () => {
  const payload = '{"eventType":"AlertIncident","data":{}}';
  const timestamp = String(Math.floor(Date.now() / 1000));

  it("accepts valid signature", () => {
    const signature = createValidSignature(
      payload,
      timestamp,
      TEST_SECRET_BASE64
    );
    const result = verifySamsaraWebhook(
      payload,
      signature,
      timestamp,
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects invalid signature", () => {
    const result = verifySamsaraWebhook(
      payload,
      "v1=0000000000000000000000000000000000000000000000000000000000000000",
      timestamp,
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("rejects tampered payload", () => {
    const signature = createValidSignature(
      payload,
      timestamp,
      TEST_SECRET_BASE64
    );
    const result = verifySamsaraWebhook(
      '{"eventType":"Tampered"}',
      signature,
      timestamp,
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(false);
  });

  it("rejects expired timestamp", () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = createValidSignature(
      payload,
      oldTimestamp,
      TEST_SECRET_BASE64
    );

    const result = verifySamsaraWebhook(
      payload,
      signature,
      oldTimestamp,
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Timestamp too old");
  });

  it("rejects invalid timestamp", () => {
    const result = verifySamsaraWebhook(
      payload,
      "v1=abc",
      "not-a-number",
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid timestamp");
  });

  it("handles signature without v1= prefix", () => {
    const signature = createValidSignature(
      payload,
      timestamp,
      TEST_SECRET_BASE64
    );
    const rawSig = signature.slice(3);

    const result = verifySamsaraWebhook(
      payload,
      rawSig,
      timestamp,
      TEST_SECRET_BASE64
    );

    expect(result.valid).toBe(true);
  });

  it("rejects wrong secret", () => {
    const wrongSecret = Buffer.from("wrong-secret").toString("base64");
    const signature = createValidSignature(
      payload,
      timestamp,
      TEST_SECRET_BASE64
    );

    const result = verifySamsaraWebhook(
      payload,
      signature,
      timestamp,
      wrongSecret
    );

    expect(result.valid).toBe(false);
  });
});
