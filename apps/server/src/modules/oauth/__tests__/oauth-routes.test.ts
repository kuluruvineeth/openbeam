import { beforeEach, describe, expect, it, mock } from "bun:test";

const OPENBEAM_API_URL = "https://api.openbeam.test";
const OPENBEAM_APP_URL = "https://app.openbeam.test";

process.env.OPENBEAM_API_URL = OPENBEAM_API_URL;
process.env.OPENBEAM_APP_URL = OPENBEAM_APP_URL;

const mockCheckLimit = mock(() => Promise.resolve(true));
const mockCreateDCRApplication = mock((_db: unknown, input: unknown) => {
  const { scopes } = input as { scopes: string[] };
  return Promise.resolve({
    id: "app_1",
    clientId: "op_client_abc123",
    scopes,
  });
});
const mockExchangeAuthorizationCode = mock(() =>
  Promise.resolve({
    accessToken: "op_access_raw",
    refreshToken: "op_refresh_raw",
    expiresIn: 7200,
    scope: "search:read",
    tokenType: "Bearer" as const,
  })
);
const mockRefreshOAuthAccessToken = mock(() =>
  Promise.resolve({
    accessToken: "op_access_new",
    refreshToken: "op_refresh_new",
    expiresIn: 7200,
    scope: "search:read",
    tokenType: "Bearer" as const,
  })
);
const mockRevokeOAuthAccessToken = mock(() => Promise.resolve(true));

mock.module("@openbeam/db", () => ({
  default: {},
  createDCRApplication: mockCreateDCRApplication,
  exchangeAuthorizationCode: mockExchangeAuthorizationCode,
  refreshOAuthAccessToken: mockRefreshOAuthAccessToken,
  revokeOAuthAccessToken: mockRevokeOAuthAccessToken,
}));

mock.module("@openbeam/redis", () => ({
  rateLimiter: { checkLimit: mockCheckLimit },
}));

async function loadWellKnown() {
  const mod = await import("../oauth.well-known");
  return mod.default;
}

async function loadRegister() {
  const mod = await import("../oauth.register");
  return mod.default;
}

async function loadToken() {
  const mod = await import("../oauth.token");
  return mod.default;
}

async function loadRevoke() {
  const mod = await import("../oauth.revoke");
  return mod.default;
}

type TestRouter = {
  request: (
    input: string | URL | Request,
    requestInit?: RequestInit
  ) => Response | Promise<Response>;
};

function jsonRequest(
  router: TestRouter,
  path: string,
  init: RequestInit
): Response | Promise<Response> {
  return router.request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("oauth well-known endpoints", () => {
  it("serves protected resource metadata with bearer_methods_supported", async () => {
    const router = await loadWellKnown();
    const res = await router.request("/.well-known/oauth-protected-resource");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      resource: string;
      authorization_servers: string[];
      scopes_supported: string[];
      bearer_methods_supported: string[];
    };
    expect(body.resource).toBe(OPENBEAM_API_URL);
    expect(body.authorization_servers).toEqual([OPENBEAM_API_URL]);
    expect(body.bearer_methods_supported).toEqual(["header"]);
    expect(body.scopes_supported.length).toBeGreaterThan(0);
  });

  it("serves authorization server metadata with PKCE and public client support", async () => {
    const router = await loadWellKnown();
    const res = await router.request("/.well-known/oauth-authorization-server");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
      registration_endpoint: string;
      revocation_endpoint: string;
      code_challenge_methods_supported: string[];
      token_endpoint_auth_methods_supported: string[];
      grant_types_supported: string[];
    };
    expect(body.issuer).toBe(OPENBEAM_API_URL);
    expect(body.authorization_endpoint).toBe(
      `${OPENBEAM_APP_URL}/oauth/authorize`
    );
    expect(body.token_endpoint).toBe(`${OPENBEAM_API_URL}/oauth/token`);
    expect(body.registration_endpoint).toBe(
      `${OPENBEAM_API_URL}/oauth/register`
    );
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(body.token_endpoint_auth_methods_supported).toEqual(["none"]);
    expect(body.grant_types_supported).toEqual([
      "authorization_code",
      "refresh_token",
    ]);
  });
});

describe("oauth register endpoint", () => {
  beforeEach(() => {
    mockCheckLimit.mockImplementation(async () => true);
    mockCheckLimit.mockClear();
    mockCreateDCRApplication.mockClear();
  });

  it("returns RFC 7591 registration metadata on success", async () => {
    const router = await loadRegister();
    const res = await jsonRequest(router, "/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Claude Desktop",
        redirect_uris: ["http://localhost:54321/callback"],
        scope: "search:read connectors:read",
        logo_uri: "https://example.com/logo.png",
        client_uri: "https://example.com",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.client_id).toBe("op_client_abc123");
    expect(typeof body.client_id_issued_at).toBe("number");
    expect(body.client_name).toBe("Claude Desktop");
    expect(body.redirect_uris).toEqual(["http://localhost:54321/callback"]);
    expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.response_types).toEqual(["code"]);
    expect(body.scope).toBe("search:read connectors:read");
    expect(body.logo_uri).toBe("https://example.com/logo.png");
    expect(body.client_uri).toBe("https://example.com");
  });

  it("rejects redirect URIs that do not match the allowed pattern", async () => {
    const router = await loadRegister();
    const res = await jsonRequest(router, "/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Broken Client",
        redirect_uris: ["not-a-valid-uri"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("accepts custom native schemes for mobile clients", async () => {
    const router = await loadRegister();
    const res = await jsonRequest(router, "/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Native Client",
        redirect_uris: ["com.example.app://callback"],
      }),
    });

    expect(res.status).toBe(201);
  });

  it("rate limits repeat registrations from the same IP", async () => {
    mockCheckLimit.mockImplementationOnce(async () => false);

    const router = await loadRegister();
    const res = await jsonRequest(router, "/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Spammy Client",
        redirect_uris: ["http://localhost:54321/callback"],
      }),
      headers: { "x-forwarded-for": "203.0.113.45" },
    });

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("too_many_requests");
    expect(mockCreateDCRApplication).not.toHaveBeenCalled();
  });

  it("passes the first forwarded-for IP into the rate limiter key", async () => {
    const router = await loadRegister();
    await jsonRequest(router, "/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Tracked Client",
        redirect_uris: ["http://localhost:54321/callback"],
      }),
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });

    expect(mockCheckLimit).toHaveBeenCalledWith(
      "oauth:dcr:203.0.113.9",
      10,
      3600
    );
  });
});

describe("oauth token endpoint", () => {
  beforeEach(() => {
    mockExchangeAuthorizationCode.mockClear();
    mockRefreshOAuthAccessToken.mockClear();
  });

  it("exchanges an authorization code for a token pair with no-store cache headers", async () => {
    const router = await loadToken();
    const res = await router.request("/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: "op_auth_code_raw",
        redirect_uri: "http://localhost:54321/callback",
        client_id: "op_client_abc123",
        code_verifier: "verifier-abcdef",
      }).toString(),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.access_token).toBe("op_access_raw");
    expect(body.refresh_token).toBe("op_refresh_raw");
    expect(body.token_type).toBe("Bearer");
    expect(body.expires_in).toBe(7200);
    expect(body.scope).toBe("search:read");
  });

  it("refreshes an access token with no-store cache headers", async () => {
    const router = await loadToken();
    const res = await router.request("/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "op_refresh_raw",
        client_id: "op_client_abc123",
      }).toString(),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
    const body = (await res.json()) as { access_token: string };
    expect(body.access_token).toBe("op_access_new");
  });

  it("maps invalid code verifier errors to OAuth invalid_grant", async () => {
    mockExchangeAuthorizationCode.mockImplementationOnce(() =>
      Promise.reject(new Error("Invalid code verifier"))
    );

    const router = await loadToken();
    const res = await jsonRequest(router, "/oauth/token", {
      method: "POST",
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: "op_auth_code_raw",
        redirect_uri: "http://localhost:54321/callback",
        client_id: "op_client_abc123",
        code_verifier: "wrong",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_grant");
  });

  it("rejects unsupported grant types", async () => {
    const router = await loadToken();
    const res = await jsonRequest(router, "/oauth/token", {
      method: "POST",
      body: JSON.stringify({ grant_type: "client_credentials" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unsupported_grant_type");
  });

  it("rejects authorization_code requests missing parameters", async () => {
    const router = await loadToken();
    const res = await jsonRequest(router, "/oauth/token", {
      method: "POST",
      body: JSON.stringify({ grant_type: "authorization_code" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_request");
  });
});

describe("oauth revoke endpoint", () => {
  beforeEach(() => {
    mockRevokeOAuthAccessToken.mockClear();
  });

  it("revokes a provided token", async () => {
    const router = await loadRevoke();
    const res = await router.request("/oauth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: "op_access_raw" }).toString(),
    });

    expect(res.status).toBe(200);
    expect(mockRevokeOAuthAccessToken).toHaveBeenCalledWith(
      expect.anything(),
      "op_access_raw"
    );
  });

  it("returns success even when no token is supplied", async () => {
    const router = await loadRevoke();
    const res = await jsonRequest(router, "/oauth/revoke", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    expect(mockRevokeOAuthAccessToken).not.toHaveBeenCalled();
  });
});
