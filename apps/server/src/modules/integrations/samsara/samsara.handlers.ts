import type { RouteHandler } from "@hono/zod-openapi";
import { createSamsaraClient, verifySamsaraWebhook } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute, webhookRoute } from "./samsara.routes";

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
    const { connectorId, apiToken, region } = c.req.valid("json");

    const client = createSamsaraClient({
      connectorId,
      apiToken,
      region,
      apiVersion: "2024-06-01",
    });

    const healthy = await client.healthCheck();
    if (!healthy) {
      return c.json(
        { success: false, message: "Invalid API token or unreachable API" },
        400
      );
    }

    return c.json({
      success: true,
      connectorId,
      name: `Samsara (${region.toUpperCase()})`,
    });
  } catch (error) {
    logger.error({ error }, "Samsara API key auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};

export const webhookHandler: RouteHandler<
  typeof webhookRoute,
  AuthEnv
> = async (c) => {
  const signature = c.req.header("X-Samsara-Signature") ?? "";
  const timestamp = c.req.header("X-Samsara-Timestamp") ?? "";
  const body = await c.req.text();

  const webhookSecret = process.env.SAMSARA_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn("SAMSARA_WEBHOOK_SECRET not configured");
    return c.json({ success: false, message: "Webhook not configured" }, 400);
  }

  const { valid, error } = verifySamsaraWebhook(
    body,
    signature,
    timestamp,
    webhookSecret
  );

  if (!valid) {
    logger.warn({ error }, "Samsara webhook signature verification failed");
    return c.json({ success: false, message: error }, 400);
  }

  logger.info(
    {
      eventType: c.req.header("X-Samsara-Event-Type"),
      orgId: c.req.header("X-Samsara-Org-Id"),
    },
    "Samsara webhook received"
  );

  return c.json({ success: true });
};
