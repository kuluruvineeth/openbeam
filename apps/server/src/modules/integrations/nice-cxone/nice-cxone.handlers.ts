import type { RouteHandler } from "@hono/zod-openapi";
import { exchangeNiceCxoneCredentials } from "@openbeam/integrations";
import { createNiceCxoneClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { authRoute } from "./nice-cxone.routes";

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
    const { connectorId, baseUrl, clientId, clientSecret } =
      c.req.valid("json");

    const tokens = await exchangeNiceCxoneCredentials({
      baseUrl,
      clientId,
      clientSecret,
    });

    const client = createNiceCxoneClient({
      connectorId,
      accessToken: tokens.accessToken,
      baseUrl: tokens.baseUrl,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access NICE CXone. Check your base URL and credentials.",
        },
        400
      );
    }

    const instanceName = new URL(tokens.baseUrl).hostname.split(".")[0];

    return c.json({
      success: true,
      connectorId,
      name: `NICE CXone (${instanceName})`,
    });
  } catch (error) {
    logger.error({ error }, "NICE CXone auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
