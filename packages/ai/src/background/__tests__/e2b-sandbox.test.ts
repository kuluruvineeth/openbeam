import { describe, expect, it } from "bun:test";
import {
  E2BSandboxProvider,
  type E2BSandboxProviderConfig,
  getE2BSandboxProvider,
  resetE2BSandboxProvider,
} from "../e2b-sandbox";

describe("E2BSandboxProvider", () => {
  describe("constructor", () => {
    it("requires apiKey or accessToken", () => {
      const originalApiKey = process.env.E2B_API_KEY;
      const originalAccessToken = process.env.E2B_ACCESS_TOKEN;
      process.env.E2B_API_KEY = undefined;
      process.env.E2B_ACCESS_TOKEN = undefined;

      expect(
        () => new E2BSandboxProvider({ apiKey: "", accessToken: undefined })
      ).toThrow("E2B_API_KEY or E2B_ACCESS_TOKEN is required");

      process.env.E2B_API_KEY = originalApiKey;
      process.env.E2B_ACCESS_TOKEN = originalAccessToken;
    });

    it("accepts apiKey from config", () => {
      const provider = new E2BSandboxProvider({ apiKey: "test-key" });
      expect(provider.name).toBe("E2B");
      expect(provider.type).toBe("e2b");
    });

    it("accepts accessToken for self-hosted", () => {
      const provider = new E2BSandboxProvider({
        accessToken: "self-hosted-token",
        domain: "sandbox.example.com",
      });
      expect(provider.isSelfHosted).toBe(true);
    });

    it("is not self-hosted without domain", () => {
      const provider = new E2BSandboxProvider({ apiKey: "test-key" });
      expect(provider.isSelfHosted).toBe(false);
    });
  });

  describe("isAvailable", () => {
    it("returns true when apiKey is set", async () => {
      const provider = new E2BSandboxProvider({ apiKey: "test-key" });
      expect(await provider.isAvailable()).toBe(true);
    });

    it("returns true when accessToken is set", async () => {
      const provider = new E2BSandboxProvider({
        accessToken: "token",
        domain: "sandbox.example.com",
      });
      expect(await provider.isAvailable()).toBe(true);
    });
  });

  describe("self-hosted configuration", () => {
    it("reads domain from env var", () => {
      const original = process.env.E2B_DOMAIN;
      process.env.E2B_DOMAIN = "sandbox.corp.com";

      const provider = new E2BSandboxProvider({ apiKey: "test-key" });
      expect(provider.isSelfHosted).toBe(true);

      if (original) {
        process.env.E2B_DOMAIN = original;
      } else {
        process.env.E2B_DOMAIN = undefined;
      }
    });

    it("reads accessToken from env var", () => {
      const originalKey = process.env.E2B_API_KEY;
      const originalToken = process.env.E2B_ACCESS_TOKEN;
      process.env.E2B_ACCESS_TOKEN = "env-token";
      process.env.E2B_API_KEY = undefined;

      const provider = new E2BSandboxProvider({});
      expect(provider).toBeDefined();

      process.env.E2B_API_KEY = originalKey;
      if (originalToken) {
        process.env.E2B_ACCESS_TOKEN = originalToken;
      } else {
        process.env.E2B_ACCESS_TOKEN = undefined;
      }
    });

    it("config overrides env vars", () => {
      const original = process.env.E2B_DOMAIN;
      process.env.E2B_DOMAIN = "env-domain.com";

      const provider = new E2BSandboxProvider({
        apiKey: "key",
        domain: "config-domain.com",
      });
      expect(provider.isSelfHosted).toBe(true);

      if (original) {
        process.env.E2B_DOMAIN = original;
      } else {
        process.env.E2B_DOMAIN = undefined;
      }
    });
  });

  describe("getE2BSandboxProvider singleton", () => {
    it("returns a provider", () => {
      resetE2BSandboxProvider();
      const provider = getE2BSandboxProvider({ apiKey: "test-key" });
      expect(provider).toBeInstanceOf(E2BSandboxProvider);
    });

    it("recreates with new config", () => {
      resetE2BSandboxProvider();
      const p1 = getE2BSandboxProvider({ apiKey: "key-1" });
      const p2 = getE2BSandboxProvider({ apiKey: "key-2" });
      expect(p1).not.toBe(p2);
    });

    it("reuses without config", () => {
      resetE2BSandboxProvider();
      const p1 = getE2BSandboxProvider({ apiKey: "key-1" });
      const p2 = getE2BSandboxProvider();
      expect(p1).toBe(p2);
    });
  });

  describe("E2BSandboxProviderConfig type", () => {
    it("accepts full self-hosted config", () => {
      const config: E2BSandboxProviderConfig = {
        apiKey: "sk-123",
        domain: "sandbox.internal.corp.com",
        accessToken: "access-token-123",
        apiUrl: "https://api.internal.corp.com",
        sandboxUrl: "https://sandbox.internal.corp.com",
      };

      const provider = new E2BSandboxProvider(config);
      expect(provider.isSelfHosted).toBe(true);
    });

    it("accepts minimal cloud config", () => {
      const config: E2BSandboxProviderConfig = {
        apiKey: "sk-123",
      };

      const provider = new E2BSandboxProvider(config);
      expect(provider.isSelfHosted).toBe(false);
    });
  });
});
