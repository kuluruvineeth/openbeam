import type { RouteHandler } from "@hono/zod-openapi";
import { createAzureIotClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./azure-iot.routes";

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
    const { connectorId, connectionString } = c.req.valid("json");

    const client = createAzureIotClient({
      connectorId,
      connectionString,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message: "Invalid connection string or IoT Hub unreachable",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `Azure IoT Hub (${client.hubName})`,
    });
  } catch (error) {
    logger.error({ error }, "Azure IoT Hub auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
