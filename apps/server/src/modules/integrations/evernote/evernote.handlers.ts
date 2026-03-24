import type { RouteHandler } from "@hono/zod-openapi";
import { createEvernoteClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./evernote.routes";

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
    const { connectorId, developerToken, environment } = c.req.valid("json");

    const client = createEvernoteClient({
      connectorId,
      developerToken,
      environment,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Evernote. Check your developer token and environment.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: "Evernote",
    });
  } catch (error) {
    logger.error({ error }, "Evernote auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
