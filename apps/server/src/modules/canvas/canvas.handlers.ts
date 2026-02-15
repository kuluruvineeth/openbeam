import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import { createExecutionAndStartCanvasWorkflow } from "@openplane/orchestrations";
import {
  CanvasServiceError,
  createCanvasForTeam,
  deleteCanvasForTeam,
  getCanvasExecutionContextForTeam,
  getCanvasForTeam,
  listCanvasExecutionsForTeam,
  listCanvasForTeam,
  publishCanvasForTeam,
  updateCanvasForTeam,
} from "@openplane/services/canvas-api";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  createCanvasExecutionRoute,
  createCanvasRoute,
  deleteCanvasRoute,
  getCanvasRoute,
  listCanvasExecutionsRoute,
  listCanvasRoute,
  publishCanvasRoute,
  updateCanvasRoute,
} from "./canvas.routes";

export const listCanvasHandler: RouteHandler<
  typeof listCanvasRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const result = await listCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const createCanvasHandler: RouteHandler<
  typeof createCanvasRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const canvas = await createCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      name: input.name,
      description: input.description,
      icon: input.icon,
      nodes: input.nodes,
      edges: input.edges,
      viewport: input.viewport,
      settings: input.settings,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
    });

    return c.json(canvas, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const getCanvasHandler: RouteHandler<
  typeof getCanvasRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const canvas = await getCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
    });

    return c.json(canvas, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const updateCanvasHandler: RouteHandler<
  typeof updateCanvasRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const updated = await updateCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
      name: input.name,
      description: input.description,
      icon: input.icon,
      nodes: input.nodes,
      edges: input.edges,
      viewport: input.viewport,
      settings: input.settings,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
    });

    return c.json(updated, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const deleteCanvasHandler: RouteHandler<
  typeof deleteCanvasRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await deleteCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const publishCanvasHandler: RouteHandler<
  typeof publishCanvasRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const canvas = await publishCanvasForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
      authContext: c.get("authContext"),
      changelog: input.changelog,
    });

    return c.json(canvas, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const listCanvasExecutionsHandler: RouteHandler<
  typeof listCanvasExecutionsRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("query");

  try {
    const result = await listCanvasExecutionsForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }
};

export const createCanvasExecutionHandler: RouteHandler<
  typeof createCanvasExecutionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  let context: Awaited<ReturnType<typeof getCanvasExecutionContextForTeam>>;

  try {
    context = await getCanvasExecutionContextForTeam(prisma, {
      teamId: getTeamId(c),
      canvasId: id,
      authContext: c.get("authContext"),
    });
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process canvas request" }, 400);
  }

  try {
    const execution = await createExecutionAndStartCanvasWorkflow({
      prisma,
      canvasId: context.canvasId,
      versionNumber: context.versionNumber,
      nodes: context.nodes,
      edges: context.edges,
      viewport: context.viewport,
      input: input.input,
      teamId: context.teamId,
      triggeredById: context.triggeredById,
      triggerSource: input.triggerSource,
      sessionId: input.sessionId,
      turnId: input.turnId,
    });

    return c.json(execution, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
};
