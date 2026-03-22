import type { RouteHandler } from "@hono/zod-openapi";
import { createPagerDutyClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./pagerduty.routes";

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
    const { connectorId, apiKey } = c.req.valid("json");

    const client = createPagerDutyClient({
      connectorId,
      apiKey,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        { success: false, message: "Invalid API key or unreachable API" },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "PagerDuty",
    });
  } catch (error) {
    logger.error({ error }, "PagerDuty API key auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
