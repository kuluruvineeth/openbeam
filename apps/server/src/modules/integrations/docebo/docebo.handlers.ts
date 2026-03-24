import type { RouteHandler } from "@hono/zod-openapi";
import { exchangeDoceboCredentials } from "@openbeam/integrations";
import { createDoceboClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { authRoute } from "./docebo.routes";

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
    const { connectorId, instanceUrl, clientId, clientSecret } =
      c.req.valid("json");

    const tokens = await exchangeDoceboCredentials({
      instanceUrl,
      clientId,
      clientSecret,
    });

    const client = createDoceboClient({
      connectorId,
      accessToken: tokens.accessToken,
      instanceUrl: tokens.instanceUrl,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Docebo. Check your instance URL and credentials.",
        },
        400
      );
    }

    const instanceName = new URL(tokens.instanceUrl).hostname.split(".")[0];

    return c.json({
      success: true,
      connectorId,
      name: `Docebo (${instanceName})`,
    });
  } catch (error) {
    logger.error({ error }, "Docebo auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
