import type { RouteHandler } from "@hono/zod-openapi";
import { createBambooHRClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./bamboohr.routes";

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
    const { connectorId, apiKey, subdomain } = c.req.valid("json");

    const client = createBambooHRClient({
      connectorId,
      apiKey,
      subdomain,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message: "Cannot access BambooHR. Check API key and subdomain.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `BambooHR (${subdomain})`,
    });
  } catch (error) {
    logger.error({ error }, "BambooHR auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
