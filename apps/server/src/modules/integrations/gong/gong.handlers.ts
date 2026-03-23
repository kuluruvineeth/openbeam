import type { RouteHandler } from "@hono/zod-openapi";
import { createGongClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./gong.routes";

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
    const { connectorId, accessKey, accessKeySecret } = c.req.valid("json");

    const client = createGongClient({
      connectorId,
      accessKey,
      accessKeySecret,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message: "Cannot connect to Gong. Check your access key and secret.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Gong",
    });
  } catch (error) {
    logger.error({ error }, "Gong auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
