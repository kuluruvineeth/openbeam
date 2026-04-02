import type { RouteHandler } from "@hono/zod-openapi";
import { createMindtickleClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./mindtickle.routes";

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
    const { connectorId, apiKey, secretKey, clientId } = c.req.valid("json");

    const client = createMindtickleClient({
      connectorId,
      apiKey,
      secretKey,
      clientId,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Mindtickle. Verify your API key, secret key, and client ID.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Mindtickle",
    });
  } catch (error) {
    logger.error({ error }, "Mindtickle auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
