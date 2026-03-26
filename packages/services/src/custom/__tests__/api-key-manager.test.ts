import { describe, expect, test } from "bun:test";
import {
  extractCustomConnectorKeyPrefix,
  generateCustomConnectorApiKey,
  isCustomConnectorKey,
  verifyCustomConnectorApiKey,
} from "../api-key-manager";

describe("generateCustomConnectorApiKey", () => {
  test("generates key with obc_ prefix", async () => {
    const { key, hash, prefix } = await generateCustomConnectorApiKey();

    expect(key.startsWith("obc_")).toBe(true);
    expect(prefix.startsWith("obc_")).toBe(true);
    expect(prefix.length).toBe(12);
    expect(key.length).toBe(60);
    expect(hash.length).toBeGreaterThan(0);
  });

  test("generates unique keys each time", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => generateCustomConnectorApiKey())
    );

    const keys = results.map((r) => r.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(5);
  });

  test("hash is different from plaintext key", async () => {
    const { key, hash } = await generateCustomConnectorApiKey();
    expect(hash).not.toBe(key);
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });
});

describe("verifyCustomConnectorApiKey", () => {
  test("verifies correct key", async () => {
    const { key, hash } = await generateCustomConnectorApiKey();
    const valid = await verifyCustomConnectorApiKey(key, hash);
    expect(valid).toBe(true);
  });

  test("rejects wrong key", async () => {
    const { hash } = await generateCustomConnectorApiKey();
    const valid = await verifyCustomConnectorApiKey("obc_wrongkey123", hash);
    expect(valid).toBe(false);
  });

  test("rejects key verified against different hash", async () => {
    const first = await generateCustomConnectorApiKey();
    const second = await generateCustomConnectorApiKey();
    const valid = await verifyCustomConnectorApiKey(first.key, second.hash);
    expect(valid).toBe(false);
  });
});

describe("extractCustomConnectorKeyPrefix", () => {
  test("extracts prefix from valid key", () => {
    const prefix = extractCustomConnectorKeyPrefix("obc_AbCdEfGhRestOfTheKey");
    expect(prefix).toBe("obc_AbCdEfGh");
  });

  test("returns null for non-obc key", () => {
    expect(extractCustomConnectorKeyPrefix("op_live_something")).toBeNull();
  });

  test("returns null for too-short key", () => {
    expect(extractCustomConnectorKeyPrefix("obc_abc")).toBeNull();
  });
});

describe("isCustomConnectorKey", () => {
  test("returns true for obc_ prefixed keys", () => {
    expect(isCustomConnectorKey("obc_something")).toBe(true);
  });

  test("returns false for other prefixes", () => {
    expect(isCustomConnectorKey("op_live_something")).toBe(false);
    expect(isCustomConnectorKey("sk_test_something")).toBe(false);
    expect(isCustomConnectorKey("")).toBe(false);
  });
});
