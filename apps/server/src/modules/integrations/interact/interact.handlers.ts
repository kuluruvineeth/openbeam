import type { RouteHandler } from "@hono/zod-openapi";
import { createInteractClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./interact.routes";

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
    const { connectorId, apiKey, instance } = c.req.valid("json");

    const client = createInteractClient({
      connectorId,
      apiKey,
      instance,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Interact. Check your API key and instance name.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Interact",
    });
  } catch (error) {
    logger.error({ error }, "Interact auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
