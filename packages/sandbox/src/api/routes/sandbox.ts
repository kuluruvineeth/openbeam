import { Hono } from "hono";
import { z } from "zod";
import { getSandboxProvider } from "../../providers/factory";
import type { SandboxProviderType } from "../../types";
import { SandboxConfigSchema } from "../../types";
import { isGlobalTeamScope, type SandboxAuthVariables } from "../auth";
import { authorizeSandboxAccess } from "../authorization";
import {
  getDefaultProviderType,
  parseJsonBody,
  parseProviderQuery,
  parseSandboxId,
} from "../http";
import { deleteSandboxOwnerTeamId, setSandboxOwnerTeamId } from "../ownership";

const TimeoutBodySchema = z.object({
  timeout: z.number().int().positive(),
});

function resolveProvider(providerType: SandboxProviderType | undefined) {
  const type = providerType ?? getDefaultProviderType();
  return getSandboxProvider({ provider: type });
}

export function sandboxRoutes() {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();

  app.post("/sandboxes", async (c) => {
    const parsedBody = await parseJsonBody(c, SandboxConfigSchema);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }
    const config = parsedBody.data;
    const teamId = c.get("teamId");

    if (
      !isGlobalTeamScope(teamId) &&
      config.teamId &&
      config.teamId !== teamId
    ) {
      return c.json({ error: "TEAM_SCOPE_MISMATCH" }, 403);
    }

    const effectiveConfig = {
      ...config,
      teamId: isGlobalTeamScope(teamId) ? config.teamId : teamId,
    };

    const provider = await getSandboxProvider({
      provider: effectiveConfig.provider,
    });
    const sandbox = await provider.create(effectiveConfig);
    const info = await sandbox.getInfo();
    await setSandboxOwnerTeamId(
      provider.type,
      info.id,
      isGlobalTeamScope(teamId) ? info.teamId : teamId
    );

    return c.json(info, 201);
  });

  app.get("/sandboxes", async (c) => {
    const scopeTeamId = c.get("teamId");
    const requestedTeamId = c.req.query("teamId");
    if (
      requestedTeamId &&
      !isGlobalTeamScope(scopeTeamId) &&
      requestedTeamId !== scopeTeamId
    ) {
      return c.json({ error: "TEAM_SCOPE_MISMATCH" }, 403);
    }

    const teamId = isGlobalTeamScope(scopeTeamId)
      ? requestedTeamId
      : scopeTeamId;
    const providerResult = parseProviderQuery(c);
    if (!providerResult.ok) {
      return providerResult.response;
    }

    const type = providerResult.data ?? getDefaultProviderType();
    const provider = await getSandboxProvider({ provider: type });
    const sandboxes = await provider.list(teamId);

    return c.json({ sandboxes });
  });

  app.get("/sandboxes/:sandboxId", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const providerResult = parseProviderQuery(c);
    if (!providerResult.ok) {
      return providerResult.response;
    }

    const provider = await resolveProvider(providerResult.data);
    const authzError = await authorizeSandboxAccess(c, provider, sandboxId);
    if (authzError) {
      return authzError;
    }
    const sandbox = await provider.connect(sandboxId);
    const info = await sandbox.getInfo();

    return c.json(info);
  });

  app.delete("/sandboxes/:sandboxId", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const providerResult = parseProviderQuery(c);
    if (!providerResult.ok) {
      return providerResult.response;
    }

    const provider = await resolveProvider(providerResult.data);
    const authzError = await authorizeSandboxAccess(c, provider, sandboxId);
    if (authzError) {
      return authzError;
    }
    await provider.destroy(sandboxId);
    await deleteSandboxOwnerTeamId(provider.type, sandboxId);

    return c.json({ deleted: true });
  });

  app.post("/sandboxes/:sandboxId/timeout", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, TimeoutBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { timeout } = bodyResult.data;
    const providerResult = parseProviderQuery(c);
    if (!providerResult.ok) {
      return providerResult.response;
    }

    const provider = await resolveProvider(providerResult.data);
    const authzError = await authorizeSandboxAccess(c, provider, sandboxId);
    if (authzError) {
      return authzError;
    }
    const sandbox = await provider.connect(sandboxId);
    await sandbox.setTimeout(timeout);

    return c.json({ ok: true });
  });

  return app;
}
