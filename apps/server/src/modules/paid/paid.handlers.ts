import prisma from "@openbeam/db";
import { searchService } from "@openbeam/services";
import { askRAGForActor } from "@openbeam/services/rag-api";
import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import { getAccessControlIds } from "@/types/auth";

export async function paidSearchHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const query = c.req.query("q") ?? "";
  const limit = Number(c.req.query("limit") ?? "10");
  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const result = await searchService.search({
    query,
    teamId,
    limit,
    accessControlIds,
  });

  return c.json(result, 200);
}

export async function paidRagAnswerHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const body = await c.req.json<{
    query: string;
    modelId?: string;
    temperature?: number;
    includeMedia?: boolean;
  }>();

  const response = await askRAGForActor(prisma, {
    teamId,
    authContext: c.get("authContext"),
    query: body.query,
    modelId: body.modelId,
    temperature: body.temperature,
    includeMedia: body.includeMedia ?? false,
  });

  return c.json(response, 200);
}

export async function paidRagSynthesizeHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const body = await c.req.json<{
    query: string;
    modelId?: string;
    temperature?: number;
  }>();

  const response = await askRAGForActor(prisma, {
    teamId,
    authContext: c.get("authContext"),
    query: body.query,
    modelId: body.modelId,
    temperature: body.temperature,
    includeMedia: false,
  });

  return c.json(response, 200);
}
