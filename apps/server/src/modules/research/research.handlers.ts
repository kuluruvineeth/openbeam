import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openbeam/db";
import {
  BackgroundAgentsServiceError,
  cancelResearchWorkflowForTeam,
  getResearchArtifactsForTeam,
  getResearchProgressForTeam,
  startResearchWorkflowForTeam,
} from "@openbeam/services/background-agents";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  cancelResearchRoute,
  getResearchArtifactsRoute,
  getResearchProgressRoute,
  startResearchRoute,
} from "./research.routes";

export const startResearchHandler: RouteHandler<
  typeof startResearchRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const workflow = await startResearchWorkflowForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      prompt: input.prompt,
      maxSteps: input.options?.maxSteps,
    });

    return c.json(workflow, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json(
      { error: "Failed to process research workflow request" },
      400
    );
  }
};

export const getResearchProgressHandler: RouteHandler<
  typeof getResearchProgressRoute,
  AuthEnv
> = async (c) => {
  const { workflowId } = c.req.valid("param");

  try {
    const progress = await getResearchProgressForTeam(prisma, {
      teamId: getTeamId(c),
      workflowId,
    });

    return c.json(progress, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json(
      { error: "Failed to process research workflow request" },
      400
    );
  }
};

export const getResearchArtifactsHandler: RouteHandler<
  typeof getResearchArtifactsRoute,
  AuthEnv
> = async (c) => {
  const { workflowId } = c.req.valid("param");

  try {
    const artifacts = await getResearchArtifactsForTeam(prisma, {
      teamId: getTeamId(c),
      workflowId,
    });

    return c.json(artifacts, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json(
      { error: "Failed to process research workflow request" },
      400
    );
  }
};

export const cancelResearchHandler: RouteHandler<
  typeof cancelResearchRoute,
  AuthEnv
> = async (c) => {
  const { workflowId } = c.req.valid("param");

  try {
    const result = await cancelResearchWorkflowForTeam(prisma, {
      teamId: getTeamId(c),
      workflowId,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof BackgroundAgentsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json(
      { error: "Failed to process research workflow request" },
      400
    );
  }
};
