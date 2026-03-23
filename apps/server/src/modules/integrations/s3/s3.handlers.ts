import type { RouteHandler } from "@hono/zod-openapi";
import { createS3Client } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute } from "./s3.routes";

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
    const { connectorId, accessKeyId, secretAccessKey, region, bucketName } =
      c.req.valid("json");

    const client = createS3Client({
      connectorId,
      accessKeyId,
      secretAccessKey,
      region,
      bucketName,
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        {
          success: false,
          message:
            "Cannot access S3 bucket. Check credentials, bucket name, and region.",
        },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `Amazon S3 (${bucketName})`,
    });
  } catch (error) {
    logger.error({ error }, "Amazon S3 auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};
