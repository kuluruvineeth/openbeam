import type { RouteHandler } from "@hono/zod-openapi";
import { createAwsIotClient } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./aws-iot.routes";

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
    const { connectorId, accessKeyId, secretAccessKey, region } =
      c.req.valid("json");

    const client = createAwsIotClient({
      connectorId,
      accessKeyId,
      secretAccessKey,
      region,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message: "Invalid AWS credentials or insufficient IoT permissions",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `AWS IoT Core (${region})`,
    });
  } catch (error) {
    logger.error({ error }, "AWS IoT Core auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
