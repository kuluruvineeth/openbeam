import type { RouteHandler } from "@hono/zod-openapi";
import { WorkdayAuth } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { callbackRoute, startAuthRoute } from "./workday.routes";

const workdayAuth = new WorkdayAuth();

export const startAuthHandler: RouteHandler<
  typeof startAuthRoute,
  AuthEnv
> = async (c) => {
  const user = c.get("user");

  if (user === null) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ success: false, message: "Workspace ID required" }, 400);
  }

  try {
    const { connectorId } = c.req.valid("json");

    const authUrl = await workdayAuth.start({
      user: { id: user.id },
      workspaceId: teamId,
      connectorId,
    });

    return c.json({ success: true, authUrl });
  } catch (error) {
    logger.error({ error }, "Workday OAuth start error");
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Workday authentication";

    return c.json({ success: false, message }, 400);
  }
};

export const callbackHandler: RouteHandler<
  typeof callbackRoute,
  AuthEnv
> = async (c) => {
  try {
    const { code, state } = c.req.valid("json");

    const { connector } = await workdayAuth.complete({
      code,
      state,
    });

    return c.json({
      success: true,
      connectorId: connector.id,
      name: connector.name,
    });
  } catch (error) {
    logger.error({ error }, "Workday OAuth callback error");
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};
