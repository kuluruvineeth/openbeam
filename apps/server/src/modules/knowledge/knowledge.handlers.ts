import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  getExpertsForTopicForTeam,
  getKnowledgeEntityForTeam,
  getKnowledgePanelForTeam,
  getKnowledgeRelationsForTeam,
  getPersonExpertiseForTeam,
  KnowledgeServiceError,
  listKnowledgeEntitiesForTeam,
  searchKnowledgeEntitiesForTeam,
} from "@openplane/services/knowledge-api";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  getEntityRoute,
  getExpertiseRoute,
  getExpertsRoute,
  getKnowledgePanelRoute,
  getRelationsRoute,
  listEntitiesRoute,
  searchEntitiesRoute,
} from "./knowledge.routes";

export const listEntitiesHandler: RouteHandler<
  typeof listEntitiesRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const result = await listKnowledgeEntitiesForTeam(prisma, {
      teamId: getTeamId(c),
      type: input.type,
      cursor: input.cursor,
      limit: input.limit,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const searchEntitiesHandler: RouteHandler<
  typeof searchEntitiesRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const result = await searchKnowledgeEntitiesForTeam(prisma, {
      teamId: getTeamId(c),
      query: input.query,
      type: input.type,
      limit: input.limit,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const getEntityHandler: RouteHandler<
  typeof getEntityRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const entity = await getKnowledgeEntityForTeam(prisma, {
      teamId: getTeamId(c),
      entityId: id,
    });

    return c.json(entity, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const getRelationsHandler: RouteHandler<
  typeof getRelationsRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const { direction } = c.req.valid("query");

  try {
    const relations = await getKnowledgeRelationsForTeam(prisma, {
      teamId: getTeamId(c),
      entityId: id,
      direction,
    });

    return c.json(relations, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const getKnowledgePanelHandler: RouteHandler<
  typeof getKnowledgePanelRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const panel = await getKnowledgePanelForTeam(prisma, {
      teamId: getTeamId(c),
      entityId: id,
    });

    return c.json(panel, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const getExpertsHandler: RouteHandler<
  typeof getExpertsRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const { limit } = c.req.valid("query");

  try {
    const experts = await getExpertsForTopicForTeam(prisma, {
      teamId: getTeamId(c),
      topicId: id,
      limit,
    });

    return c.json(experts, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};

export const getExpertiseHandler: RouteHandler<
  typeof getExpertiseRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const { limit } = c.req.valid("query");

  try {
    const expertise = await getPersonExpertiseForTeam(prisma, {
      teamId: getTeamId(c),
      personId: id,
      limit,
    });

    return c.json(expertise, 200);
  } catch (error) {
    if (error instanceof KnowledgeServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process knowledge request" }, 400);
  }
};
