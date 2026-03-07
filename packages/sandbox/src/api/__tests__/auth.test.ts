import { afterEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import {
  getGlobalTeamScope,
  requireSandboxAuth,
  type SandboxAuthVariables,
} from "../auth";

function createApp() {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();
  app.use("*", requireSandboxAuth);
  app.get("/secure", (c) => c.json({ teamId: c.get("teamId") }));
  return app;
}

function restoreEnv(key: string, value: string | undefined) {
  process.env[key] = value;
}

describe("sandbox auth middleware", () => {
  const originalToken = process.env.SANDBOX_API_TOKEN;
  const originalRequireTeamId = process.env.SANDBOX_REQUIRE_TEAM_ID;

  afterEach(() => {
    restoreEnv("SANDBOX_API_TOKEN", originalToken);
    restoreEnv("SANDBOX_REQUIRE_TEAM_ID", originalRequireTeamId);
  });

  it("rejects requests with missing token", async () => {
    process.env.SANDBOX_API_TOKEN = "secret-token";
    process.env.SANDBOX_REQUIRE_TEAM_ID = undefined;

    const app = createApp();
    const response = await app.request("http://localhost/secure");

    expect(response.status).toBe(401);
    const body = (await response.json()) as {
      error?: string;
      teamId?: string;
    };
    expect(body).toEqual({ error: "UNAUTHORIZED" });
  });

  it("rejects missing team header when team scope is required", async () => {
    process.env.SANDBOX_API_TOKEN = "secret-token";
    process.env.SANDBOX_REQUIRE_TEAM_ID = undefined;

    const app = createApp();
    const response = await app.request("http://localhost/secure", {
      headers: {
        authorization: "Bearer secret-token",
      },
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error?: string;
      teamId?: string;
    };
    expect(body.error).toBe("MISSING_TEAM_SCOPE");
  });

  it("accepts valid token and team scope header", async () => {
    process.env.SANDBOX_API_TOKEN = "secret-token";
    process.env.SANDBOX_REQUIRE_TEAM_ID = undefined;

    const app = createApp();
    const response = await app.request("http://localhost/secure", {
      headers: {
        authorization: "Bearer secret-token",
        "x-openbeam-team-id": "team-enterprise",
      },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      error?: string;
      teamId?: string;
    };
    expect(body.teamId).toBe("team-enterprise");
  });

  it("supports global scope fallback when team requirement is disabled", async () => {
    process.env.SANDBOX_API_TOKEN = "secret-token";
    process.env.SANDBOX_REQUIRE_TEAM_ID = "false";

    const app = createApp();
    const response = await app.request("http://localhost/secure", {
      headers: {
        authorization: "Bearer secret-token",
      },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      error?: string;
      teamId?: string;
    };
    expect(body.teamId).toBe(getGlobalTeamScope());
  });
});
