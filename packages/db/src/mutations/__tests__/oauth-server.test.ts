import { describe, expect, it } from "bun:test";
import {
  createAuthorizationCode,
  createDCRApplication,
  exchangeAuthorizationCode,
  refreshOAuthAccessToken,
  revokeOAuthAccessToken,
} from "../oauth-server";
import { createDbStub, pkcePair, sha256Hex } from "./oauth-server-fixtures";

describe("createDCRApplication", () => {
  it("creates a public active application with issued client id", async () => {
    const { db, applications } = createDbStub();

    const result = await createDCRApplication(db, {
      name: "Claude Desktop",
      redirectUris: ["http://localhost:54321/callback"],
      scopes: ["search:read"],
    });

    expect(result.clientId.startsWith("op_client_")).toBe(true);
    const stored = applications.get(result.clientId);
    expect(stored?.isPublic).toBe(true);
    expect(stored?.active).toBe(true);
  });
});

describe("exchangeAuthorizationCode", () => {
  it("issues tokens when PKCE verifier matches challenge", async () => {
    const pkce = pkcePair("verifier-abcdefghij-0123456789-abcdefghij-0123");
    const { db } = createDbStub({
      authCode: { codeChallenge: pkce.challenge, codeChallengeMethod: "S256" },
    });

    const result = await exchangeAuthorizationCode(db, {
      code: "op_auth_code_test",
      redirectUri: "http://localhost:54321/callback",
      clientId: "op_client_test",
      codeVerifier: pkce.verifier,
    });

    expect(result.accessToken.startsWith("op_access_")).toBe(true);
    expect(result.refreshToken.startsWith("op_refresh_")).toBe(true);
    expect(result.expiresIn).toBe(7200);
    expect(result.tokenType).toBe("Bearer");
    expect(result.scope).toBe("search:read connectors:read");
  });

  it("rejects when PKCE verifier does not match challenge", async () => {
    const pkce = pkcePair("verifier-abcdefghij-0123456789-abcdefghij-0123");
    const { db } = createDbStub({
      authCode: { codeChallenge: pkce.challenge },
    });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
        codeVerifier: "wrong-verifier-abcdefghij-0123456789-0000",
      })
    ).rejects.toThrow("Invalid code verifier");
  });

  it("rejects when the verifier is missing for a PKCE-gated code", async () => {
    const pkce = pkcePair("verifier-abcdefghij-0123456789-abcdefghij-0123");
    const { db } = createDbStub({
      authCode: { codeChallenge: pkce.challenge },
    });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Code verifier required");
  });

  it("rejects an unknown code", async () => {
    const { db } = createDbStub({ authCode: null });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_missing",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Invalid authorization code");
  });

  it("rejects an expired code", async () => {
    const { db } = createDbStub({
      authCode: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Authorization code expired");
  });

  it("rejects when the client id does not match", async () => {
    const { db } = createDbStub();

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_other",
      })
    ).rejects.toThrow("Invalid client credentials");
  });

  it("rejects when the redirect uri does not match", async () => {
    const { db } = createDbStub();

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/other",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Redirect URI mismatch");
  });

  it("revokes previously issued tokens on replay of a used code", async () => {
    const { db, tokens } = createDbStub({
      authCode: { used: true },
      accessToken: {},
    });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Authorization code already used");

    expect(tokens[0]?.revoked).toBe(true);
    expect(tokens[0]?.revokedAt).not.toBeNull();
  });

  it("rejects when the application is inactive", async () => {
    const { db } = createDbStub({ application: { active: false } });

    await expect(
      exchangeAuthorizationCode(db, {
        code: "op_auth_code_test",
        redirectUri: "http://localhost:54321/callback",
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Application is inactive");
  });
});

describe("refreshOAuthAccessToken", () => {
  const refreshToken = "op_refresh_raw";
  const refreshHash = sha256Hex(refreshToken);

  it("issues a new token pair and revokes the old one", async () => {
    const { db, tokens } = createDbStub({
      accessToken: { refreshTokenHash: refreshHash },
    });

    const result = await refreshOAuthAccessToken(db, {
      refreshToken,
      clientId: "op_client_test",
    });

    expect(result.accessToken.startsWith("op_access_")).toBe(true);
    expect(result.refreshToken.startsWith("op_refresh_")).toBe(true);
    expect(result.scope).toBe("search:read connectors:read");
    expect(tokens.length).toBe(2);
    expect(tokens[0]?.revoked).toBe(true);
  });

  it("rejects a revoked refresh token", async () => {
    const { db } = createDbStub({
      accessToken: { refreshTokenHash: refreshHash, revoked: true },
    });

    await expect(
      refreshOAuthAccessToken(db, {
        refreshToken,
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Refresh token revoked");
  });

  it("rejects an expired refresh token", async () => {
    const { db } = createDbStub({
      accessToken: {
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    await expect(
      refreshOAuthAccessToken(db, {
        refreshToken,
        clientId: "op_client_test",
      })
    ).rejects.toThrow("Refresh token expired");
  });

  it("rejects scope widening", async () => {
    const { db } = createDbStub({
      accessToken: { refreshTokenHash: refreshHash },
    });

    await expect(
      refreshOAuthAccessToken(db, {
        refreshToken,
        clientId: "op_client_test",
        scope: "search:read admin:*",
      })
    ).rejects.toThrow("Invalid scope: admin:*");
  });

  it("accepts scope narrowing", async () => {
    const { db } = createDbStub({
      accessToken: { refreshTokenHash: refreshHash },
    });

    const result = await refreshOAuthAccessToken(db, {
      refreshToken,
      clientId: "op_client_test",
      scope: "search:read",
    });

    expect(result.scope).toBe("search:read");
  });

  it("rejects when the client id does not match", async () => {
    const { db } = createDbStub({
      accessToken: { refreshTokenHash: refreshHash },
    });

    await expect(
      refreshOAuthAccessToken(db, {
        refreshToken,
        clientId: "op_client_other",
      })
    ).rejects.toThrow("Invalid client credentials");
  });
});

describe("revokeOAuthAccessToken", () => {
  it("revokes by access token hash", async () => {
    const rawAccessToken = "op_access_raw";
    const { db, tokens } = createDbStub({
      accessToken: { tokenHash: sha256Hex(rawAccessToken) },
    });

    const result = await revokeOAuthAccessToken(db, rawAccessToken);

    expect(result).toBe(true);
    expect(tokens[0]?.revoked).toBe(true);
  });

  it("revokes by refresh token hash when access hash does not match", async () => {
    const rawRefreshToken = "op_refresh_raw";
    const { db, tokens } = createDbStub({
      accessToken: { refreshTokenHash: sha256Hex(rawRefreshToken) },
    });

    const result = await revokeOAuthAccessToken(db, rawRefreshToken);

    expect(result).toBe(true);
    expect(tokens[0]?.revoked).toBe(true);
  });

  it("returns false when no matching token exists", async () => {
    const { db } = createDbStub();

    const result = await revokeOAuthAccessToken(db, "op_access_unknown");

    expect(result).toBe(false);
  });
});

describe("createAuthorizationCode", () => {
  it("stores a code with PKCE challenge and S256 method", async () => {
    const { db, authCodes } = createDbStub({ authCode: null });

    const { code } = await createAuthorizationCode(db, {
      applicationId: "app_1",
      userId: "user_1",
      teamId: "team_1",
      scopes: ["search:read"],
      redirectUri: "http://localhost:54321/callback",
      codeChallenge: "challenge-value",
    });

    expect(code.startsWith("op_auth_code_")).toBe(true);
    expect(authCodes[0]?.codeChallenge).toBe("challenge-value");
    expect(authCodes[0]?.codeChallengeMethod).toBe("S256");
  });

  it("omits code challenge method when no challenge is provided", async () => {
    const { db, authCodes } = createDbStub({ authCode: null });

    await createAuthorizationCode(db, {
      applicationId: "app_1",
      userId: "user_1",
      teamId: "team_1",
      scopes: ["search:read"],
      redirectUri: "http://localhost:54321/callback",
    });

    expect(authCodes[0]?.codeChallenge).toBeUndefined();
    expect(authCodes[0]?.codeChallengeMethod).toBeUndefined();
  });
});
