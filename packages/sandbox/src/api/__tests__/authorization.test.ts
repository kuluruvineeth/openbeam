import { afterEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { SandboxProvider } from "../../types";
import { getGlobalTeamScope, type SandboxAuthVariables } from "../auth";
import { authorizeSandboxAccess } from "../authorization";
import {
  clearSandboxOwnershipStore,
  setSandboxOwnerTeamId,
} from "../ownership";

function createProvider(
  ids: string[],
  options?: {
    listCalls?: { value: number };
  }
): SandboxProvider {
  return {
    type: "local",
    isAvailable: () => Promise.resolve(true),
    create: () => Promise.reject(new Error("not needed")),
    connect: () => Promise.reject(new Error("not needed")),
    list: () => {
      if (options?.listCalls) {
        options.listCalls.value += 1;
      }
      return Promise.resolve(
        ids.map((id) => ({
          id,
          status: "running" as const,
          provider: "local" as const,
          template: "base",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
          resources: { cpuCores: 1, memoryMb: 512, diskMb: 1024 },
        }))
      );
    },
    destroy: () => Promise.reject(new Error("not needed")),
  };
}

function createApp(teamId: string, provider: SandboxProvider) {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();
  app.use("*", async (c, next) => {
    c.set("teamId", teamId);
    await next();
  });
  app.get("/access/:sandboxId", async (c) => {
    const accessError = await authorizeSandboxAccess(
      c,
      provider,
      c.req.param("sandboxId")
    );
    if (accessError) {
      return accessError;
    }
    return c.json({ ok: true });
  });
  return app;
}

describe("sandbox ownership authorization", () => {
  afterEach(() => {
    clearSandboxOwnershipStore();
  });

  it("allows access when sandbox is owned by team", async () => {
    const app = createApp("team-1", createProvider(["sbx-1"]));
    const response = await app.request("http://localhost/access/sbx-1");
    expect(response.status).toBe(200);
  });

  it("returns not found when sandbox is not owned by team", async () => {
    const app = createApp("team-1", createProvider(["sbx-9"]));
    const response = await app.request("http://localhost/access/sbx-1");
    expect(response.status).toBe(404);
  });

  it("bypasses ownership checks for global scope", async () => {
    const app = createApp(getGlobalTeamScope(), createProvider([]));
    const response = await app.request("http://localhost/access/sbx-1");
    expect(response.status).toBe(200);
  });

  it("uses ownership mapping before provider scan when mapping exists", async () => {
    const listCalls = { value: 0 };
    const provider = createProvider([], { listCalls });
    await setSandboxOwnerTeamId("local", "sbx-1", "team-1");

    const app = createApp("team-1", provider);
    const response = await app.request("http://localhost/access/sbx-1");

    expect(response.status).toBe(200);
    expect(listCalls.value).toBe(0);
  });

  it("denies access when ownership mapping belongs to another team", async () => {
    const listCalls = { value: 0 };
    const provider = createProvider(["sbx-1"], { listCalls });
    await setSandboxOwnerTeamId("local", "sbx-1", "team-2");

    const app = createApp("team-1", provider);
    const response = await app.request("http://localhost/access/sbx-1");

    expect(response.status).toBe(404);
    expect(listCalls.value).toBe(0);
  });
});
