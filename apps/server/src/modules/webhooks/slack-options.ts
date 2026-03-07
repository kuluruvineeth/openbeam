import prisma, {
  findSlackConnectorByTeamId,
  getDecryptedOAuthCredentials,
} from "@openbeam/db";
import {
  createSlackClient,
  getAllChannels,
  verifySlackSignature,
} from "@openbeam/services";
import { Hono } from "hono";
import logger from "../../utils/logger";

interface SlackConnectorConfig {
  teamId?: string;
  signing_secret?: string;
}

interface OptionsPayload {
  type: "block_suggestion";
  action_id: string;
  block_id: string;
  value: string;
  team: { id: string };
  user: { id: string };
}

interface SlackOption {
  text: { type: "plain_text"; text: string };
  value: string;
}

const slackOptions = new Hono();

slackOptions.post("/", async (c) => {
  const rawBody = await c.req.text();
  const payload = parseOptionsPayload(
    rawBody,
    c.req.header("content-type") ?? ""
  );

  if (!payload) {
    return c.json({ options: [] });
  }

  const teamId = payload.team?.id;
  if (!teamId) {
    return c.json({ options: [] });
  }

  const connector = await findSlackConnectorByTeamId(prisma, teamId);
  if (!connector) {
    return c.json({ options: [] });
  }

  const config = connector.config as SlackConnectorConfig | null;
  if (config?.signing_secret) {
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");

    if (signature && timestamp) {
      const verifyResult = verifySlackSignature(
        { body: rawBody, signature, timestamp },
        config.signing_secret
      );
      if (!verifyResult.valid) {
        logger.warn(
          { reason: verifyResult.reason },
          "Invalid options signature"
        );
        return c.json({ options: [] });
      }
    }
  }

  const actionId = payload.action_id;
  const searchValue = payload.value?.toLowerCase() ?? "";

  try {
    const options = await resolveOptions(connector.id, actionId, searchValue);
    return c.json({ options });
  } catch (error) {
    logger.error({ error, actionId }, "Failed to resolve options");
    return c.json({ options: [] });
  }
});

function parseOptionsPayload(
  rawBody: string,
  contentType: string
): OptionsPayload | null {
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const payloadStr = params.get("payload");
      return payloadStr ? JSON.parse(payloadStr) : null;
    }
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function resolveOptions(
  connectorId: string,
  actionId: string,
  searchValue: string
): Promise<SlackOption[]> {
  if (actionId.includes("channel")) {
    return getChannelOptions(connectorId, searchValue);
  }

  if (actionId.includes("timezone")) {
    return Promise.resolve(getTimezoneOptions(searchValue));
  }

  return Promise.resolve([]);
}

async function getChannelOptions(
  connectorId: string,
  searchValue: string
): Promise<SlackOption[]> {
  const credentials = await getDecryptedOAuthCredentials(prisma, connectorId);
  if (!credentials?.accessToken) {
    return [];
  }

  const client = createSlackClient({
    token: credentials.accessToken,
    connectorId,
  });
  const channels = await getAllChannels(client, { limit: 100 });

  const filtered = searchValue
    ? channels.filter((ch) => ch.name?.toLowerCase().includes(searchValue))
    : channels;

  return filtered.slice(0, 25).map((ch) => ({
    text: { type: "plain_text" as const, text: `#${ch.name ?? ch.id}` },
    value: ch.id,
  }));
}

function getTimezoneOptions(searchValue: string): SlackOption[] {
  const timezones = [
    { label: "Pacific Time (US)", value: "America/Los_Angeles" },
    { label: "Mountain Time (US)", value: "America/Denver" },
    { label: "Central Time (US)", value: "America/Chicago" },
    { label: "Eastern Time (US)", value: "America/New_York" },
    { label: "UTC", value: "UTC" },
    { label: "London (GMT)", value: "Europe/London" },
    { label: "Paris (CET)", value: "Europe/Paris" },
    { label: "Berlin (CET)", value: "Europe/Berlin" },
    { label: "Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Sydney (AEST)", value: "Australia/Sydney" },
    { label: "Singapore (SGT)", value: "Asia/Singapore" },
    { label: "Mumbai (IST)", value: "Asia/Kolkata" },
  ];

  const filtered = searchValue
    ? timezones.filter(
        (tz) =>
          tz.label.toLowerCase().includes(searchValue) ||
          tz.value.toLowerCase().includes(searchValue)
      )
    : timezones;

  return filtered.map((tz) => ({
    text: { type: "plain_text" as const, text: tz.label },
    value: tz.value,
  }));
}

export { slackOptions };
