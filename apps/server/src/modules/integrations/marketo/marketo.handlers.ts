import type { RouteHandler } from "@hono/zod-openapi";
import { exchangeMarketoCredentials } from "@openbeam/integrations";
import { createMarketoClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { authRoute } from "./marketo.routes";

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
    const { connectorId, munchkinId, clientId, clientSecret } =
      c.req.valid("json");

    const tokens = await exchangeMarketoCredentials({
      munchkinId,
      clientId,
      clientSecret,
    });

    const client = createMarketoClient({
      connectorId,
      accessToken: tokens.accessToken,
      munchkinId,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access Marketo. Check your Munchkin ID and credentials.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `Marketo (${munchkinId})`,
    });
  } catch (error) {
    logger.error({ error }, "Marketo auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
