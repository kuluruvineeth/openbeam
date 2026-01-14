import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createSecretRef,
  isSecretRef,
  resolveSecret,
  SecretResolutionError,
} from "../secrets";

describe("secrets", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("resolveSecret", () => {
    it("resolves secret from environment variable", () => {
      process.env.TEST_SECRET = "secret-value";

      const result = resolveSecret({ secretName: "TEST_SECRET" });

      expect(result).toBe("secret-value");
    });

    it("converts secret name to uppercase", () => {
      process.env.MY_API_KEY = "api-key-value";

      const result = resolveSecret({ secretName: "my_api_key" });

      expect(result).toBe("api-key-value");
    });

    it("throws SecretResolutionError when env var not found", () => {
      expect(() => resolveSecret({ secretName: "NONEXISTENT_SECRET" })).toThrow(
        SecretResolutionError
      );
    });

    it("includes secret name in error", () => {
      try {
        resolveSecret({ secretName: "MISSING_VAR" });
      } catch (error) {
        expect(error).toBeInstanceOf(SecretResolutionError);
        expect((error as SecretResolutionError).secretName).toBe("MISSING_VAR");
      }
    });
  });

  describe("createSecretRef", () => {
    it("creates a secret ref with secretName", () => {
      const ref = createSecretRef("MY_SECRET");

      expect(ref).toEqual({ secretName: "MY_SECRET" });
    });
  });

  describe("isSecretRef", () => {
    it("returns true for valid SecretRef", () => {
      expect(isSecretRef({ secretName: "test" })).toBe(true);
    });

    it("returns false for null", () => {
      expect(isSecretRef(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSecretRef(undefined)).toBe(false);
    });

    it("returns false for string", () => {
      expect(isSecretRef("test")).toBe(false);
    });

    it("returns false for object without secretName", () => {
      expect(isSecretRef({ name: "test" })).toBe(false);
    });

    it("returns false for object with non-string secretName", () => {
      expect(isSecretRef({ secretName: 123 })).toBe(false);
    });
  });
});
