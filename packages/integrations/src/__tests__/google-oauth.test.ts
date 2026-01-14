import { describe, expect, it } from "bun:test";
import { GoogleOAuthError, generateGoogleAuthUrl } from "../google/oauth";

describe("google oauth", () => {
  describe("generateGoogleAuthUrl", () => {
    const baseConfig = {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["openid", "email", "profile"],
    };

    it("generates auth URL with required parameters", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(baseConfig.authUrl);
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "https://example.com/callback"
      );
      expect(parsed.searchParams.get("state")).toBe("test-state");
      expect(parsed.searchParams.get("response_type")).toBe("code");
    });

    it("uses config scopes by default", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    });

    it("allows custom scopes", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
        scopes: ["custom-scope-1", "custom-scope-2"],
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("scope")).toBe(
        "custom-scope-1 custom-scope-2"
      );
    });

    it("defaults to offline access type", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("access_type")).toBe("offline");
    });

    it("defaults to consent prompt", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("prompt")).toBe("consent");
    });

    it("allows custom access type", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
        accessType: "online",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("access_type")).toBe("online");
    });

    it("allows custom prompt", () => {
      const url = generateGoogleAuthUrl({
        config: baseConfig,
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "test-state",
        prompt: "select_account",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("prompt")).toBe("select_account");
    });
  });

  describe("GoogleOAuthError", () => {
    it("captures operation and status code", () => {
      const error = new GoogleOAuthError("exchange", 401, "Unauthorized");

      expect(error.name).toBe("GoogleOAuthError");
      expect(error.operation).toBe("exchange");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("is an instance of Error", () => {
      const error = new GoogleOAuthError("refresh", 500, "Server error");

      expect(error).toBeInstanceOf(Error);
    });
  });
});
