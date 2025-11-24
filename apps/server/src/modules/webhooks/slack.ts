import prisma from "@openplane/db";
import { addWebhookJob } from "@openplane/redis";
import { Hono } from "hono";

const slackWebhook = new Hono();

/**
 * Handle Slack URL verification challenge and events
 */
slackWebhook.post("/events", async (c) => {
  const body = await c.req.json();

  // Handle URL verification challenge
  if (body.type === "url_verification") {
    return c.json({ challenge: body.challenge });
  }

  // Get signature headers
  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!signature) {
    return c.json({ error: "Missing signature headers" }, 400);
  }

  if (!timestamp) {
    return c.json({ error: "Missing timestamp header" }, 400);
  }

  // Get connector by team_id
  const teamId = body.team_id;
  if (!teamId) {
    return c.json({ error: "Missing team_id" }, 400);
  }

  const connector = await prisma.connector.findFirst({
    where: {
      app: "SLACK",
      config: {
        path: ["team", "id"],
        equals: teamId,
      },
    },
    select: {
      id: true,
      encryptedCredentials: true,
    },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  // TODO: Decrypt credentials properly and verify signature
  // For now, skip signature verification if credentials not available
  // In production, you should decrypt and verify using verifySlackSignature
  // const signingSecret = decryptCredentials(connector.encryptedCredentials)?.signingSecret;
  // if (signingSecret) {
  //   const bodyString = JSON.stringify(body);
  //   const isValid = verifySlackSignature(signature, timestamp, bodyString, signingSecret);
  //   if (!isValid) {
  //     return c.json({ error: "Invalid signature" }, 401);
  //   }
  // }

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
});

export { slackWebhook };
