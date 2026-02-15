import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  BackgroundAgentsServiceError,
  cancelBackgroundAgentForTeam,
  createBackgroundAgentForTeam,
  deleteBackgroundAgentForTeam,
  getBackgroundAgentForTeam,
  getBackgroundAgentLogsForTeam,
  listBackgroundAgentsForTeam,
  pauseBackgroundAgentForTeam,
  resumeBackgroundAgentForTeam,
} from "@openplane/services/background-agents";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  cancelBackgroundAgentRoute,
  createBackgroundAgentRoute,
  deleteBackgroundAgentRoute,
  getBackgroundAgentLogsRoute,
  getBackgroundAgentRoute,
  listBackgroundAgentsRoute,
  pauseBackgroundAgentRoute,
  resumeBackgroundAgentRoute,
} from "./background-agents.routes";

export const listBackgroundAgentsHandler: RouteHandler<
  typeof listBackgroundAgentsRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const result = await listBackgroundAgentsForTeam(prisma, {
      teamId: getTeamId(c),
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const createBackgroundAgentHandler: RouteHandler<
  typeof createBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const agent = await createBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      name: input.name,
      description: input.description,
      prompt: input.prompt,
      preset: input.preset,
      sandboxType: input.sandboxType,
      repositoryUrl: input.repositoryUrl,
      baseBranch: input.baseBranch,
      timeoutMs: input.timeoutMs,
    });

    return c.json(agent, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const getBackgroundAgentHandler: RouteHandler<
  typeof getBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const agent = await getBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
    });

    return c.json(agent, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const deleteBackgroundAgentHandler: RouteHandler<
  typeof deleteBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await deleteBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const pauseBackgroundAgentHandler: RouteHandler<
  typeof pauseBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await pauseBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const resumeBackgroundAgentHandler: RouteHandler<
  typeof resumeBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await resumeBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const cancelBackgroundAgentHandler: RouteHandler<
  typeof cancelBackgroundAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await cancelBackgroundAgentForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};

export const getBackgroundAgentLogsHandler: RouteHandler<
  typeof getBackgroundAgentLogsRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("query");

  try {
    const logs = await getBackgroundAgentLogsForTeam(prisma, {
      teamId: getTeamId(c),
      agentId: id,
      level: input.level,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(logs, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process background agent request" }, 400);
  }
};
