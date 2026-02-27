import { describe, expect, it } from "bun:test";
import { generateGitHubAuthUrl } from "../github/oauth";

describe("github oauth", () => {
  describe("generateGitHubAuthUrl", () => {
    it("generates auth URL with required parameters", () => {
      const url = generateGitHubAuthUrl({
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "state-123",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://github.com/login/oauth/authorize"
      );
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "https://example.com/callback"
      );
      expect(parsed.searchParams.get("state")).toBe("state-123");
      expect(parsed.searchParams.get("allow_signup")).toBe("true");
    });

    it("uses app scopes by default", () => {
      const url = generateGitHubAuthUrl({
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "state-123",
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("scope")).toBe(
        "read:user user:email repo read:org"
      );
    });

    it("allows custom scopes", () => {
      const url = generateGitHubAuthUrl({
        clientId: "test-client-id",
        redirectUri: "https://example.com/callback",
        state: "state-123",
        scopes: ["repo:status", "read:org"],
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("scope")).toBe("repo:status read:org");
    });
  });
});
