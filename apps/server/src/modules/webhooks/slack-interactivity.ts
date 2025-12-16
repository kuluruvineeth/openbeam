import prisma, { findSlackConnectorByTeamId } from "@openplane/db";
import {
  extractChannelId,
  extractTeamId,
  extractTriggerId,
  extractUserId,
  parseInteractivityPayload,
} from "@openplane/services";
import type { Context } from "hono";
import { Hono } from "hono";
import logger from "../../utils/logger";
import {
  handleBlockActions,
  handleGlobalShortcut,
  handleMessageShortcut,
  handleSlashCommand,
  handleViewSubmission,
} from "./slack-interactivity-handlers";
import type {
  BlockActionPayload,
  GlobalShortcutPayload,
  HandlerContext,
  MessageShortcutPayload,
  SlackConnectorConfig,
  SlashCommandPayload,
  ViewSubmissionPayload,
} from "./slack-interactivity-types";
import { parsePayload, verifyRequest } from "./slack-interactivity-utils";

const slackInteractivity = new Hono();

slackInteractivity.post("/", async (c) => {
  const rawBody = await c.req.text();

  const payload = parsePayload(rawBody, c.req.header("content-type") ?? "");
  if (!payload) {
    return c.json({ error: "Invalid payload format" }, 400);
  }

  const parseResult = parseInteractivityPayload(payload);
  if (!parseResult.success) {
    logger.warn({ error: parseResult.error }, "Failed to parse interactivity");
    return c.json({ error: parseResult.error }, 400);
  }

  const teamId = extractTeamId(parseResult.payload);
  if (!teamId) {
    return c.json({ error: "Missing team_id" }, 400);
  }

  const connector = await findSlackConnectorByTeamId(prisma, teamId);
  if (!connector) {
    logger.warn({ teamId }, "Connector not found for interactivity");
    return c.json({ error: "Connector not found" }, 404);
  }

  const config = connector.config as SlackConnectorConfig | null;
  if (!verifyRequest(c, rawBody, config?.signing_secret)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const handlerContext: HandlerContext = {
    connectorId: connector.id,
    teamId: connector.teamId,
    userId: extractUserId(parseResult.payload),
    channelId: extractChannelId(parseResult.payload),
    triggerId: extractTriggerId(parseResult.payload),
  };

  try {
    logger.debug(
      { type: parseResult.type, handlerContext },
      "Routing interaction"
    );
    return await routeInteraction(
      c,
      parseResult.type,
      parseResult.payload,
      handlerContext
    );
  } catch (error) {
    logger.error(
      { error, type: parseResult.type, handlerContext },
      "Interactivity error"
    );
    return c.json({ error: "Internal error" }, 500);
  }
});

function routeInteraction(
  c: Context,
  type: string,
  payload: unknown,
  ctx: HandlerContext
) {
  switch (type) {
    case "slash_command":
      return handleSlashCommand(c, payload as SlashCommandPayload, ctx);
    case "block_actions":
      return handleBlockActions(c, payload as BlockActionPayload, ctx);
    case "view_submission":
      return handleViewSubmission(c, payload as ViewSubmissionPayload, ctx);
    case "message_action":
      return handleMessageShortcut(c, payload as MessageShortcutPayload, ctx);
    case "shortcut":
      return handleGlobalShortcut(c, payload as GlobalShortcutPayload, ctx);
    default:
      return c.json({ error: "Unknown interaction type" }, 400);
  }
}

export { slackInteractivity };
