import prisma from "@openplane/db";
import { addWebhookJob } from "@openplane/redis";
import { parseSlackEvent, verifySlackSignature } from "@openplane/services";
import { Hono } from "hono";
import logger from "../../utils/logger";

const slackWebhook = new Hono();

interface SlackConnectorConfig {
  teamId?: string;
  signing_secret?: string;
  [key: string]: unknown;
}

slackWebhook.post("/events", async (c) => {
  const rawBody = await c.req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const parseResult = parseSlackEvent(payload);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error }, 400);
  }

  const { envelope, event } = parseResult;

  if (envelope.type === "url_verification") {
    return c.json({ challenge: envelope.challenge });
  }

  if (envelope.type === "app_rate_limited") {
    logger.warn(
      { teamId: envelope.team_id, eventTime: envelope.event_time },
      "Slack app rate limited"
    );
    return c.json({ ok: true });
  }

  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!(signature && timestamp)) {
    return c.json({ error: "Missing signature headers" }, 400);
  }
  const teamId = envelope.team_id;
  if (!teamId) {
    return c.json({ error: "Missing team_id in event" }, 400);
  }

  const connector = await prisma.connector.findFirst({
    where: {
      app: "SLACK",
      status: "ACTIVE",
      config: {
        path: ["teamId"],
        equals: teamId,
      },
    },
    select: {
      id: true,
      config: true,
      teamId: true,
    },
  });

  if (!connector) {
    logger.warn({ teamId }, "Slack webhook connector not found");
    return c.json({ error: "Connector not found" }, 404);
  }

  const config = connector.config as SlackConnectorConfig | null;
  const signingSecret = config?.signing_secret;

  if (signingSecret) {
    const verifyResult = verifySlackSignature(
      {
        body: rawBody,
        signature,
        timestamp,
      },
      signingSecret
    );

    if (!verifyResult.valid) {
      logger.warn(
        { connectorId: connector.id, reason: verifyResult.reason },
        "Slack webhook invalid signature"
      );
      return c.json({ error: "Invalid signature" }, 401);
    }
  } else {
    logger.warn(
      { connectorId: connector.id },
      "Slack webhook no signing secret configured"
    );
  }

  if (!event) {
    return c.json({ error: "Missing event in callback" }, 400);
  }

  const eventId = envelope.event_id ?? generateEventId(event);

  await addWebhookJob({
    connectorId: connector.id,
    eventId,
    eventType: event.type,
    source: "slack",
    payload: payload as Record<string, unknown>,
    receivedAt: new Date(),
  });

  return c.json({ ok: true });
});

function generateEventId(event: {
  type: string;
  ts?: string;
  event_ts?: string;
}): string {
  const ts = event.ts ?? event.event_ts ?? Date.now().toString();
  return `${event.type}-${ts}`;
}

export { slackWebhook };
