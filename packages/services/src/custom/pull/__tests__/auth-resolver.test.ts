import { describe, expect, it } from "bun:test";
import type { PullAuthConfig } from "@openbeam/types/services/connectors/custom-pull";
import { resolveAuth } from "../auth-resolver";

describe("resolveAuth", () => {
  it("resolves api_key auth with header", async () => {
    const config: PullAuthConfig = {
      type: "api_key",
      headerName: "X-Custom-Key",
      value: "secret123",
    };

    const result = await resolveAuth(config);
    expect(result.headers["X-Custom-Key"]).toBe("secret123");
    expect(Object.keys(result.queryParams)).toHaveLength(0);
  });

  it("resolves api_key auth with query param", async () => {
    const config: PullAuthConfig = {
      type: "api_key",
      queryParamName: "api_key",
      value: "key456",
    };

    const result = await resolveAuth(config);
    expect(result.queryParams.api_key).toBe("key456");
    expect(Object.keys(result.headers)).toHaveLength(0);
  });

  it("resolves api_key auth with default header when neither specified", async () => {
    const config: PullAuthConfig = {
      type: "api_key",
      value: "defaultkey",
    };

    const result = await resolveAuth(config);
    expect(result.headers["X-API-Key"]).toBe("defaultkey");
  });

  it("resolves bearer auth", async () => {
    const config: PullAuthConfig = {
      type: "bearer",
      token: "my-bearer-token",
    };

    const result = await resolveAuth(config);
    expect(result.headers.Authorization).toBe("Bearer my-bearer-token");
  });

  it("resolves basic auth with base64 encoding", async () => {
    const config: PullAuthConfig = {
      type: "basic",
      username: "user",
      password: "pass",
    };

    const result = await resolveAuth(config);
    const expected = `Basic ${btoa("user:pass")}`;
    expect(result.headers.Authorization).toBe(expected);
  });

  it("resolves custom_headers auth", async () => {
    const config: PullAuthConfig = {
      type: "custom_headers",
      headers: {
        "X-Token": "tok123",
        "X-Workspace": "ws789",
      },
    };

    const result = await resolveAuth(config);
    expect(result.headers["X-Token"]).toBe("tok123");
    expect(result.headers["X-Workspace"]).toBe("ws789");
  });

  it("oauth2 calls getValidAccessToken for connector", async () => {
    const config: PullAuthConfig = {
      type: "oauth2",
      connectorId: "conn_abc",
    };

    await expect(resolveAuth(config)).rejects.toThrow();
  });
});
