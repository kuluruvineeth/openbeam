import type { RouteHandler } from "@hono/zod-openapi";
import { createJenkinsClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./jenkins.routes";

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
    const { connectorId, instanceUrl, username, apiToken } =
      c.req.valid("json");

    const client = createJenkinsClient({
      connectorId,
      instanceUrl,
      username,
      apiToken,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Jenkins. Check your instance URL, username, and API token.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Jenkins",
    });
  } catch (error) {
    logger.error({ error }, "Jenkins auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
