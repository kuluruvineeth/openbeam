import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import type { SignatureConfig } from "@openbeam/types/services/connectors/custom-webhook";
import { verifyCustomWebhookSignature } from "../signature";

function sign(body: string, secret: string, algorithm = "sha256"): string {
  return createHmac(algorithm, secret).update(body).digest("hex");
}

describe("verifyCustomWebhookSignature", () => {
  const body = '{"event":"push","data":{}}';
  const secret = "whsec_test_secret_123";

  it("validates correct HMAC-SHA256 signature", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "hmac-sha256",
    };
    const headers = { "x-signature": sign(body, secret) };

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(true);
  });

  it("validates correct HMAC-SHA1 signature", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "hmac-sha1",
    };
    const headers = { "x-signature": sign(body, secret, "sha1") };

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(true);
  });

  it("validates signature with prefix stripping", () => {
    const config: SignatureConfig = {
      header: "X-Hub-Signature-256",
      algorithm: "hmac-sha256",
      prefix: "sha256=",
    };
    const headers = {
      "x-hub-signature-256": `sha256=${sign(body, secret)}`,
    };

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid signature", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "hmac-sha256",
    };
    const headers = { "x-signature": "deadbeef".repeat(8) };

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("rejects missing signature header", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "hmac-sha256",
    };
    const headers: Record<string, string> = {};

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing signature header");
  });

  it("skips verification when algorithm is none", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "none",
    };
    const headers: Record<string, string> = {};

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(true);
  });

  it("rejects wrong prefix on signature", () => {
    const config: SignatureConfig = {
      header: "X-Signature",
      algorithm: "hmac-sha256",
      prefix: "sha256=",
    };
    const headers = { "x-signature": sign(body, secret) };

    const result = verifyCustomWebhookSignature(body, headers, config, secret);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("prefix");
  });
});
