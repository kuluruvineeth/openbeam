import type { RouteHandler } from "@hono/zod-openapi";
import { createVerkadaClient, verifyVerkadaWebhook } from "@openplane/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { apiKeyAuthRoute, webhookRoute } from "./verkada.routes";

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
    const { connectorId, apiKey, region } = c.req.valid("json");

    const client = createVerkadaClient({
      connectorId,
      apiKey,
      region,
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
      name: `Verkada (${region.toUpperCase()})`,
    });
  } catch (error) {
    logger.error({ error }, "Verkada API key auth error");
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return c.json({ success: false, message }, 400);
  }
};

export const webhookHandler: RouteHandler<
  typeof webhookRoute,
  AuthEnv
> = async (c) => {
  const signatureHeader = c.req.header("Verkada-Signature") ?? "";
  const body = await c.req.text();

  const webhookSecret = process.env.VERKADA_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn("VERKADA_WEBHOOK_SECRET not configured");
    return c.json({ success: false, message: "Webhook not configured" }, 400);
  }

  const { valid, error } = verifyVerkadaWebhook(
    body,
    signatureHeader,
    webhookSecret
  );

  if (!valid) {
    logger.warn({ error }, "Verkada webhook signature verification failed");
    return c.json({ success: false, message: error }, 400);
  }

  logger.info({ webhookType: "verkada" }, "Verkada webhook received");

  return c.json({ success: true });
};
