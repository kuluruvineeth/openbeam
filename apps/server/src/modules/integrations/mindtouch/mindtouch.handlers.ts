import type { RouteHandler } from "@hono/zod-openapi";
import { createMindtouchClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./mindtouch.routes";

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
    const { connectorId, apiKey, instanceUrl } = c.req.valid("json");

    const client = createMindtouchClient({
      connectorId,
      apiToken: apiKey,
      instanceUrl,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Mindtouch. Check your API token and instance URL.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Mindtouch",
    });
  } catch (error) {
    logger.error({ error }, "Mindtouch auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
