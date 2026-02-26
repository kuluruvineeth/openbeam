import { Hono } from "hono";
import { z } from "zod";
import { getSandboxProvider } from "../../providers/factory";
import type { SandboxProviderType } from "../../types";
import type { SandboxAuthVariables } from "../auth";
import { authorizeSandboxAccess } from "../authorization";
import {
  getDefaultProviderType,
  parseJsonBody,
  parseProviderQuery,
  parseSandboxId,
} from "../http";

const RunCommandBodySchema = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).optional(),
  env: z.record(z.string(), z.string()).optional(),
  timeout: z.number().int().positive().optional(),
});

const RunCodeBodySchema = z.object({
  code: z.string().min(1),
  language: z.enum(["python", "javascript", "bash"]).optional(),
});

const KillProcessBodySchema = z.object({
  pid: z.number().int().nonnegative(),
});

function resolveProvider(providerType: SandboxProviderType | undefined) {
  const type = providerType ?? getDefaultProviderType();
  return getSandboxProvider({ provider: type });
}

export function execRoutes() {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();

  app.post("/:sandboxId/exec/run", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, RunCommandBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { command, cwd, env, timeout } = bodyResult.data;
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
    const result = await sandbox.commands.run(command, { cwd, env, timeout });

    return c.json(result);
  });

  app.post("/:sandboxId/exec/code", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, RunCodeBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { code, language } = bodyResult.data;
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
    const result = await sandbox.code.run(code, language);

    return c.json(result);
  });

  app.get("/:sandboxId/exec/list", async (c) => {
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
    const processes = await sandbox.commands.list();

    return c.json({ processes });
  });

  app.post("/:sandboxId/exec/kill", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, KillProcessBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { pid } = bodyResult.data;
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
    await sandbox.commands.kill(pid);

    return c.json({ ok: true });
  });

  return app;
}
