import prisma from "@openbeam/db";
import { verifyControlAgentApiKey } from "@openbeam/services";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./auth";

const AGENT_KEY_PREFIX = "opc_";

export const agentAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const existingContext = c.get("authContext");
  if (existingContext && existingContext.type !== "none") {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    await next();
    return;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token?.startsWith(AGENT_KEY_PREFIX)) {
    await next();
    return;
  }

  const key = await verifyControlAgentApiKey(prisma, token);
  if (!key || key.revokedAt) {
    await next();
    return;
  }

  c.set("authContext", {
    type: "agent",
    agentId: key.agentId,
    teamId: key.teamId,
  });

  await next();
});

export const requireAgentAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const ctx = c.get("authContext");
  if (ctx?.type !== "agent") {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Agent auth required" } },
      403
    );
  }
  await next();
});
