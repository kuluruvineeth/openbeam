import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  AppsServiceError,
  createConnectorForTeam,
  deleteConnectorForTeam,
  getConnectorForTeam,
  listConnectorResourcesForTeam,
  listConnectorsForTeam,
  updateConnectorConfigForTeam,
  updateConnectorResourceForTeam,
} from "@openplane/services/apps";
import { runConnectorCleanup } from "@openplane/temporal";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  createConnectorRoute,
  deleteConnectorRoute,
  getConnectorRoute,
  listConnectorResourcesRoute,
  listConnectorsRoute,
  updateConnectorResourceRoute,
  updateConnectorRoute,
} from "./apps.routes";

export const listConnectorsHandler: RouteHandler<
  typeof listConnectorsRoute,
  AuthEnv
> = async (c) => {
  try {
    const result = await listConnectorsForTeam(prisma, {
      teamId: getTeamId(c),
    });
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const getConnectorHandler: RouteHandler<
  typeof getConnectorRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const connector = await getConnectorForTeam(prisma, {
      teamId: getTeamId(c),
      id,
    });
    return c.json(connector, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const createConnectorHandler: RouteHandler<
  typeof createConnectorRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const connector = await createConnectorForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      appId: input.appId,
      workspaceExternalId: input.workspaceExternalId,
      name: input.name,
      type: input.type,
      authType: input.authType,
      config: input.config,
    });

    return c.json(connector, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const updateConnectorHandler: RouteHandler<
  typeof updateConnectorRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const updated = await updateConnectorConfigForTeam(prisma, {
      teamId: getTeamId(c),
      connectorId: id,
      config: input.config,
    });

    return c.json(updated, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const deleteConnectorHandler: RouteHandler<
  typeof deleteConnectorRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const deleted = await deleteConnectorForTeam(prisma, {
      teamId: getTeamId(c),
      connectorId: id,
      authContext: c.get("authContext"),
    });

    await runConnectorCleanup({
      connectorId: deleted.id,
      teamId: deleted.teamId,
    });

    return c.json(deleted, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const listConnectorResourcesHandler: RouteHandler<
  typeof listConnectorResourcesRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("query");

  try {
    const resources = await listConnectorResourcesForTeam(prisma, {
      teamId: getTeamId(c),
      connectorId: id,
      search: input.search,
      cursor: input.cursor,
      limit: input.limit,
    });

    return c.json(resources, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};

export const updateConnectorResourceHandler: RouteHandler<
  typeof updateConnectorResourceRoute,
  AuthEnv
> = async (c) => {
  const { resourceId } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const updated = await updateConnectorResourceForTeam(prisma, {
      teamId: getTeamId(c),
      resourceId,
      syncEnabled: input.syncEnabled,
    });

    return c.json(updated, 200);
  } catch (error) {
    if (error instanceof AppsServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process connector request" }, 400);
  }
};
