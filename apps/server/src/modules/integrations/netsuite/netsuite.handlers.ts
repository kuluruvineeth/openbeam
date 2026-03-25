import type { RouteHandler } from "@hono/zod-openapi";
import { validateNetsuiteCredentials } from "@openbeam/integrations";
import { createNetsuiteClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { authRoute } from "./netsuite.routes";

export const authHandler: RouteHandler<typeof authRoute, AuthEnv> = async (
  c
) => {
  const user = c.get("user");

  if (user === null) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ success: false, message: "Workspace ID required" }, 400);
  }

  try {
    const {
      connectorId,
      accountId,
      consumerKey,
      consumerSecret,
      tokenKey,
      tokenSecret,
    } = c.req.valid("json");

    await validateNetsuiteCredentials({
      accountId,
      consumerKey,
      consumerSecret,
      tokenKey,
      tokenSecret,
    });

    const client = createNetsuiteClient({
      connectorId,
      accountId,
      consumerKey,
      consumerSecret,
      tokenKey,
      tokenSecret,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access NetSuite. Check your account ID and credentials.",
        },
        400
      );
    }

    const accountSlug = accountId.toLowerCase().replace(/_/g, "-");

    return c.json({
      success: true,
      connectorId,
      name: `NetSuite (${accountSlug})`,
    });
  } catch (error) {
    logger.error({ error }, "NetSuite auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
