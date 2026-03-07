import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openbeam/db";
import {
  getDocumentPermissionsForTeam,
  getMyPermissionsForTeam,
  getPermissionStatsForTeam,
  getPermissionSyncStatusForTeam,
  getUserConnectorScopesForTeam,
  getUserGroupsForTeam,
  invalidatePermissionsCacheForTeam,
  listPermissionSyncStatusesForTeam,
  PermissionsServiceError,
} from "@openbeam/services/permissions-api";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  getDocumentPermissionsRoute,
  getMyPermissionsRoute,
  getStatsRoute,
  getSyncStatusRoute,
  getUserConnectorScopesRoute,
  getUserGroupsRoute,
  invalidateCacheRoute,
  listSyncStatusesRoute,
} from "./permissions.routes";

export const getSyncStatusHandler: RouteHandler<
  typeof getSyncStatusRoute,
  AuthEnv
> = async (c) => {
  const { connectorId } = c.req.valid("param");

  try {
    const status = await getPermissionSyncStatusForTeam(prisma, {
      teamId: getTeamId(c),
      connectorId,
    });

    return c.json(status, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const listSyncStatusesHandler: RouteHandler<
  typeof listSyncStatusesRoute,
  AuthEnv
> = async (c) => {
  try {
    const statuses = await listPermissionSyncStatusesForTeam(prisma, {
      teamId: getTeamId(c),
    });

    return c.json(statuses, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const invalidateCacheHandler: RouteHandler<
  typeof invalidateCacheRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    await invalidatePermissionsCacheForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      scope: input.scope,
      userId: input.userId,
      connectorId: input.connectorId,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const getMyPermissionsHandler: RouteHandler<
  typeof getMyPermissionsRoute,
  AuthEnv
> = async (c) => {
  try {
    const permissions = await getMyPermissionsForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
    });

    return c.json(permissions, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const getDocumentPermissionsHandler: RouteHandler<
  typeof getDocumentPermissionsRoute,
  AuthEnv
> = async (c) => {
  const { documentId } = c.req.valid("param");

  try {
    const permissions = await getDocumentPermissionsForTeam(prisma, {
      teamId: getTeamId(c),
      documentId,
    });

    return c.json(permissions, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const getUserGroupsHandler: RouteHandler<
  typeof getUserGroupsRoute,
  AuthEnv
> = async (c) => {
  const { userId } = c.req.valid("query");

  try {
    const memberships = await getUserGroupsForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      userId,
    });

    return c.json(memberships, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      if (error.code === "BAD_REQUEST") {
        return c.json({ error: error.message }, 400);
      }
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const getUserConnectorScopesHandler: RouteHandler<
  typeof getUserConnectorScopesRoute,
  AuthEnv
> = async (c) => {
  const { userId } = c.req.valid("query");

  try {
    const scopes = await getUserConnectorScopesForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      userId,
    });

    return c.json(scopes, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      if (error.code === "BAD_REQUEST") {
        return c.json({ error: error.message }, 400);
      }
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};

export const getStatsHandler: RouteHandler<
  typeof getStatsRoute,
  AuthEnv
> = async (c) => {
  try {
    const stats = await getPermissionStatsForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
    });

    return c.json(stats, 200);
  } catch (error) {
    if (error instanceof PermissionsServiceError) {
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process permissions request" }, 400);
  }
};
