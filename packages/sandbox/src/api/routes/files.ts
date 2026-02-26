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

const FilePathBodySchema = z.object({
  path: z.string().min(1),
});

const WriteFileBodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

function resolveProvider(providerType: SandboxProviderType | undefined) {
  const type = providerType ?? getDefaultProviderType();
  return getSandboxProvider({ provider: type });
}

export function fileRoutes() {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();

  app.post("/:sandboxId/files/read", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, FilePathBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path } = bodyResult.data;
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
    const content = await sandbox.files.read(path);

    return c.json({ content });
  });

  app.post("/:sandboxId/files/write", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, WriteFileBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path, content } = bodyResult.data;
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
    await sandbox.files.write(path, content);

    return c.json({ ok: true });
  });

  app.post("/:sandboxId/files/list", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, FilePathBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path } = bodyResult.data;
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
    const files = await sandbox.files.list(path);

    return c.json({ files });
  });

  app.post("/:sandboxId/files/remove", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, FilePathBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path } = bodyResult.data;
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
    await sandbox.files.remove(path);

    return c.json({ ok: true });
  });

  app.post("/:sandboxId/files/mkdir", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, FilePathBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path } = bodyResult.data;
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
    await sandbox.files.mkdir(path);

    return c.json({ ok: true });
  });

  app.post("/:sandboxId/files/exists", async (c) => {
    const sandboxIdResult = parseSandboxId(c);
    if (!sandboxIdResult.ok) {
      return sandboxIdResult.response;
    }
    const sandboxId = sandboxIdResult.data;
    const bodyResult = await parseJsonBody(c, FilePathBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }
    const { path } = bodyResult.data;
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
    const exists = await sandbox.files.exists(path);

    return c.json({ exists });
  });

  return app;
}
