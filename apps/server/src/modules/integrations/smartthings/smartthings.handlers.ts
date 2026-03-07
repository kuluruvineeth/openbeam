import type { RouteHandler } from "@hono/zod-openapi";
import { createSmartThingsClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./smartthings.routes";

export const apiKeyAuthHandler: RouteHandler<
  typeof apiKeyAuthRoute,
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
    const { connectorId, accessToken } = c.req.valid("json");

    const client = createSmartThingsClient({
      connectorId,
      accessToken,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message: "Invalid access token or SmartThings API unreachable",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "SmartThings",
    });
  } catch (error) {
    logger.error({ error }, "SmartThings auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
