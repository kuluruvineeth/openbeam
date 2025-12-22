import prisma, {
  findSlackConnectorByTeamId,
  getDecryptedOAuthCredentials,
} from "@openplane/db";
import { addWebhookJob, createStateStore, rateLimiter } from "@openplane/redis";
import {
  type AssistantThreadContextChangedEvent,
  type AssistantThreadStartedEvent,
  addReaction,
  createSlackClient,
  handleAppHomeOpened,
  handleAssistantContextChanged,
  handleAssistantThreadStarted,
  parseSlackEvent,
  verifySlackSignature,
} from "@openplane/services";
import type { Context } from "hono";
import { Hono } from "hono";
import logger from "../../utils/logger";

const slackWebhook = new Hono();

interface SlackConnectorConfig {
  teamId?: string;
  signing_secret?: string;
}

interface ConnectorInfo {
  id: string;
  config: unknown;
  teamId: string;
}

interface AppHomeOpenedEvent {
  type: "app_home_opened";
  user: string;
  channel: string;
  tab: "home" | "messages";
  event_ts: string;
}

interface AppMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  ts: string;
  channel: string;
  event_ts: string;
}

const UI_ONLY_EVENTS = new Set([
  "app_home_opened",
  "assistant_thread_started",
  "assistant_thread_context_changed",
]);

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

  const quickResponse = handleQuickResponses(c, envelope);
  if (quickResponse) {
    return quickResponse;
  }

  const validationResult = await validateAndGetConnector(c, rawBody, envelope);
  if ("error" in validationResult) {
    return validationResult.error;
  }

  const { connector } = validationResult;

  const rawEvent = envelope.event as
    | { type: string; [key: string]: unknown }
    | undefined;

  if (rawEvent && UI_ONLY_EVENTS.has(rawEvent.type)) {
    logger.info(
      { eventType: rawEvent.type, connectorId: connector.id },
      "Handling UI-only event"
    );
    await handleUiOnlyEvent(rawEvent, connector);
    return c.json({ ok: true });
  }

  if (!event) {
    logger.warn(
      { eventType: rawEvent?.type, connectorId: connector.id },
      "Failed to parse Slack event"
    );
    return c.json({ error: "Missing event in callback" }, 400);
  }

  if (UI_ONLY_EVENTS.has(event.type)) {
    await handleUiOnlyEvent(event, connector);
    return c.json({ ok: true });
  }

  await handleSyncEvents(event, connector);

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

function handleQuickResponses(
  c: Context,
  envelope: {
    type: string;
    challenge?: string;
    team_id?: string;
    event_time?: number;
  }
) {
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

  return null;
}

async function validateAndGetConnector(
  c: Context,
  rawBody: string,
  envelope: { team_id?: string }
): Promise<{ connector: ConnectorInfo } | { error: Response }> {
  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!(signature && timestamp)) {
    return { error: c.json({ error: "Missing signature headers" }, 400) };
  }

  const teamId = envelope.team_id;
  if (!teamId) {
    return { error: c.json({ error: "Missing team_id in event" }, 400) };
  }

  const connector = await findSlackConnectorByTeamId(prisma, teamId);
  if (!connector) {
    logger.warn({ teamId }, "Slack webhook connector not found");
    return { error: c.json({ error: "Connector not found" }, 404) };
  }

  const config = connector.config as SlackConnectorConfig | null;
  if (!config?.signing_secret) {
    logger.error(
      { connectorId: connector.id },
      "Slack signing secret not configured - rejecting request"
    );
    return { error: c.json({ error: "Configuration error" }, 500) };
  }

  const verifyResult = verifySlackSignature(
    { body: rawBody, signature, timestamp },
    config.signing_secret
  );

  if (!verifyResult.valid) {
    logger.warn(
      { connectorId: connector.id, reason: verifyResult.reason },
      "Slack webhook invalid signature"
    );
    return { error: c.json({ error: "Invalid signature" }, 401) };
  }

  const rateAllowed = await rateLimiter.checkLimit(
    `slack:webhook:${connector.teamId}`,
    100,
    60
  );
  if (!rateAllowed) {
    logger.warn(
      { teamId: connector.teamId },
      "Slack webhook rate limit exceeded"
    );
    return { error: c.json({ error: "Rate limit exceeded" }, 429) };
  }

  return { connector };
}

async function handleUiOnlyEvent(
  event: { type: string; [key: string]: unknown },
  connector: ConnectorInfo
) {
  if (event.type === "app_home_opened") {
    try {
      const client = await getSlackClientForConnector(
        connector.id,
        connector.teamId
      );
      const homeEvent = event as unknown as AppHomeOpenedEvent;
      await handleAppHomeOpened(client, homeEvent, connector.id, {
        stateStore: createStateStore(),
      });
    } catch (error) {
      logger.error(
        { error, connectorId: connector.id },
        "Failed to handle app_home_opened"
      );
    }
  }

  if (event.type === "assistant_thread_started") {
    logger.info(
      { connectorId: connector.id, event },
      "Processing assistant_thread_started"
    );
    try {
      const client = await getSlackClientForConnector(
        connector.id,
        connector.teamId
      );
      const threadEvent = event as unknown as AssistantThreadStartedEvent;
      await handleAssistantThreadStarted(
        client,
        threadEvent,
        connector.id,
        connector.teamId
      );
      logger.info(
        { connectorId: connector.id },
        "Successfully handled assistant_thread_started"
      );
    } catch (error) {
      logger.error(
        { error, connectorId: connector.id },
        "Failed to handle assistant_thread_started"
      );
    }
  }

  if (event.type === "assistant_thread_context_changed") {
    try {
      const client = await getSlackClientForConnector(
        connector.id,
        connector.teamId
      );
      const contextEvent =
        event as unknown as AssistantThreadContextChangedEvent;
      await handleAssistantContextChanged(
        client,
        contextEvent,
        connector.id,
        connector.teamId
      );
    } catch (error) {
      logger.error(
        { error, connectorId: connector.id },
        "Failed to handle assistant_thread_context_changed"
      );
    }
  }
}

async function handleSyncEvents(
  event: { type: string; [key: string]: unknown },
  connector: ConnectorInfo
) {
  if (event.type === "app_mention") {
    const mentionEvent = event as unknown as AppMentionEvent;
    try {
      const client = await getSlackClientForConnector(connector.id);
      await addReaction(client, mentionEvent.channel, mentionEvent.ts, "eyes");
    } catch (error) {
      logger.debug(
        { error, channel: mentionEvent.channel, ts: mentionEvent.ts },
        "Failed to add reaction to app_mention"
      );
    }
  }
}

async function getSlackClientForConnector(
  connectorId: string,
  teamId?: string
) {
  const credentials = await getDecryptedOAuthCredentials(prisma, connectorId);
  if (!credentials?.accessToken) {
    throw new Error("No access token");
  }
  return createSlackClient({
    token: credentials.accessToken,
    connectorId,
    teamId,
  });
}

function generateEventId(event: {
  type: string;
  ts?: string;
  event_ts?: string;
}): string {
  const ts = event.ts ?? event.event_ts ?? Date.now().toString();
  return `${event.type}-${ts}`;
}

export { slackWebhook };
