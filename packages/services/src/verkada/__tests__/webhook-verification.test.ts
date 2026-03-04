import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyVerkadaWebhook } from "../push/webhook-verification";

const TEST_SECRET = "test-webhook-secret-key-123";

function createValidSignature(payload: string, timestamp: number): string {
  const message = `${payload}|${timestamp}`;
  const signature = createHmac("sha256", TEST_SECRET)
    .update(message)
    .digest("hex");
  return `${timestamp}|${signature}`;
}

describe("verifyVerkadaWebhook", () => {
  it("accepts valid signature", () => {
    const payload = '{"webhook_type":"notification","data":{}}';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = createValidSignature(payload, timestamp);

    const result = verifyVerkadaWebhook(payload, header, TEST_SECRET);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects invalid signature", () => {
    const payload = '{"webhook_type":"notification"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `${timestamp}|0000000000000000000000000000000000000000000000000000000000000000`;

    const result = verifyVerkadaWebhook(payload, header, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("rejects tampered payload", () => {
    const originalPayload = '{"webhook_type":"notification"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = createValidSignature(originalPayload, timestamp);

    const result = verifyVerkadaWebhook(
      '{"webhook_type":"tampered"}',
      header,
      TEST_SECRET
    );
    expect(result.valid).toBe(false);
  });

  it("rejects expired timestamp", () => {
    const payload = '{"webhook_type":"notification"}';
    const oldTimestamp = Math.floor(Date.now() / 1000) - 120;
    const header = createValidSignature(payload, oldTimestamp);

    const result = verifyVerkadaWebhook(payload, header, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Timestamp too old");
  });

  it("rejects invalid signature format", () => {
    const result = verifyVerkadaWebhook("{}", "no-pipe-here", TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid signature format");
  });

  it("rejects invalid timestamp", () => {
    const result = verifyVerkadaWebhook(
      "{}",
      "not-a-number|abcdef",
      TEST_SECRET
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid timestamp");
  });

  it("rejects with wrong secret", () => {
    const payload = '{"webhook_type":"notification"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = createValidSignature(payload, timestamp);

    const result = verifyVerkadaWebhook(payload, header, "wrong-secret");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });
});
