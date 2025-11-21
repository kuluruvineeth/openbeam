/**
 * Slack Webhook Handler
 * 
 * Handles incoming webhooks from Slack for real-time updates.
 */

import { addWebhookJob } from "@openplane/redis";
import { createHmac } from "node:crypto";
import { Hono } from "hono";
import prisma from "@openplane/db";

const slackWebhook = new Hono();

/**
 * Verify Slack signature (HMAC-SHA256)
 */
function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  const requestTimestamp = parseInt(timestamp);

  // Check if request is too old
  if (requestTimestamp < fiveMinutesAgo) {
    return false;
  }

  // Calculate expected signature
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest("hex")}`;

  return signature === expectedSignature;
}

/**
 * Handle Slack URL verification challenge
 */
slackWebhook.post("/events", async (c) => {
  try {
    const body = await c.req.json();

    // Handle URL verification challenge
    if (body.type === "url_verification") {
      return c.json({ challenge: body.challenge });
    }

    // Get signature headers
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (!signature || !timestamp) {
      return c.json({ error: "Missing signature headers" }, 400);
    }

    // Get connector by team_id
    const teamId = body.team_id;
    if (!teamId) {
      return c.json({ error: "Missing team_id" }, 400);
    }

    const connector = await prisma.connector.findFirst({
      where: {
        type: "SLACK",
        config: {
          path: ["team", "id"],
          equals: teamId,
        },
      },
    });

    if (!connector) {
      return c.json({ error: "Connector not found" }, 404);
    }

    // Verify signature
    const signingSecret = (connector.credentials as any)?.signingSecret;
    if (signingSecret) {
      const bodyString = JSON.stringify(body);
      const isValid = verifySlackSignature(signature, timestamp, bodyString, signingSecret);

      if (!isValid) {
        return c.json({ error: "Invalid signature" }, 401);
      }
    }

    // Extract event
    const event = body.event;
    if (!event) {
      return c.json({ error: "Missing event" }, 400);
    }

    // Enqueue webhook job
    await addWebhookJob({
      connectorId: connector.id,
      eventId: body.event_id || `${event.type}-${event.ts}`,
      eventType: event.type,
      source: "slack",
      payload: body,
      receivedAt: new Date(),
    });

    return c.json({ ok: true });
  } catch (error) {
    console.error("Slack webhook error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

export { slackWebhook };

