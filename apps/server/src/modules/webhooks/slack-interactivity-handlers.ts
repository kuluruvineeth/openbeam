import prisma, {
  findSlackChannelConfig,
  upsertSlackChannelConfig,
  upsertSlackDigestSubscription,
} from "@openbeam/db";
import { createStateStore } from "@openbeam/redis";
import {
  extractSettingsFromSubmission,
  handleSaveSettings,
  handleSaveShortcut,
  handleSearchContextShortcut,
  handleSummarizeShortcut,
  routeCommand,
  SHORTCUT_CALLBACK_IDS,
  SIDEBAR_CALLBACK_IDS,
} from "@openbeam/services";
import type { Context } from "hono";
import logger from "../../utils/logger";
import {
  executeGlobalSearch,
  handleHomeAction,
} from "./slack-interactivity-home";
import {
  handleFeedbackAction,
  handleNotHelpfulRetry,
  handleShareResponse,
  handleSidebarPromptAction,
  handleSidebarSearchAction,
  updateFeedbackMessage,
} from "./slack-interactivity-sidebar";
import type {
  BlockActionPayload,
  GlobalShortcutPayload,
  HandlerContext,
  MessageShortcutPayload,
  SlashCommandPayload,
  ViewSubmissionPayload,
} from "./slack-interactivity-types";
import {
  buildAskModal,
  buildSearchModal,
  createRagService,
  createSaveStore,
  createSearchService,
  extractCheckboxValue,
  extractMultiSelectValue,
  extractSelectValue,
  extractTextValue,
  getSlackClient,
  isFeedbackAction,
  parsePrivateMetadata,
} from "./slack-interactivity-utils";

const WHITESPACE_PATTERN = /\s+/;
const ASYNC_COMMANDS = new Set(["ask"]);
const SYNC_COMMANDS_WITH_CLIENT = new Set(["configure"]);

export async function handleSlashCommand(
  c: Context,
  payload: SlashCommandPayload,
  ctx: HandlerContext
) {
  const parts = payload.text.trim().split(WHITESPACE_PATTERN);
  const subcommand = parts[0]?.toLowerCase() ?? "";

  if (ASYNC_COMMANDS.has(subcommand)) {
    logger.info(
      { connectorId: ctx.connectorId, subcommand },
      "Async slash command received"
    );
    return c.json({
      response_type: "ephemeral",
      text: "This command is not yet available.",
    });
  }

  if (SYNC_COMMANDS_WITH_CLIENT.has(subcommand)) {
    const client = await getSlackClient(ctx.connectorId, ctx.teamId);
    const existingConfig = await findSlackChannelConfig(
      prisma,
      ctx.connectorId,
      payload.channel_id
    );

    const result = await routeCommand(payload, {
      connectorId: ctx.connectorId,
      teamId: ctx.teamId,
      accessControlIds: [ctx.userId, `team:${ctx.teamId}`],
      client,
      channelConfig: existingConfig
        ? {
            responseMode: existingConfig.responseMode as
              | "always"
              | "confident"
              | "mention_only"
              | "never",
            reactionsEnabled: existingConfig.reactionsEnabled,
            respondToWorkflows: existingConfig.respondToWorkflows,
          }
        : undefined,
    });

    if (!(result.text || result.blocks)) {
      return c.body(null, 200);
    }
    return c.json(result);
  }

  const result = await routeCommand(payload, {
    connectorId: ctx.connectorId,
    teamId: ctx.teamId,
    accessControlIds: [ctx.userId, `team:${ctx.teamId}`],
  });

  return c.json(result);
}

export async function handleBlockActions(
  c: Context,
  payload: BlockActionPayload,
  ctx: HandlerContext
) {
  const action = payload.actions[0];
  if (!action) {
    return c.json({ ok: true });
  }

  const actionId = action.action_id;
  const messageTs = payload.message?.ts ?? "";
  const responseKey = action.value;

  if (actionId === "assistant_share_response") {
    await handleShareResponse(
      ctx,
      responseKey,
      payload.message,
      payload.response_url
    );
    return c.json({ ok: true });
  }

  if (actionId.startsWith(SIDEBAR_CALLBACK_IDS.PROMPT_SELECT)) {
    await handleSidebarPromptAction(ctx, actionId, payload);
    return c.json({ ok: true });
  }

  if (actionId.startsWith(SIDEBAR_CALLBACK_IDS.SUGGESTION_CLICK)) {
    logger.debug(
      { actionId, userId: ctx.userId },
      "Sidebar suggestion clicked"
    );
    return c.json({ ok: true });
  }

  if (actionId === SIDEBAR_CALLBACK_IDS.SEARCH_SUBMIT) {
    await handleSidebarSearchAction(ctx, payload);
    return c.json({ ok: true });
  }

  if (isFeedbackAction(actionId)) {
    const feedbackType = actionId.includes("not_helpful")
      ? "not_helpful"
      : "helpful";

    await handleFeedbackAction(ctx, messageTs, feedbackType, responseKey);

    if (feedbackType === "not_helpful" && responseKey) {
      const retried = await handleNotHelpfulRetry(
        ctx,
        responseKey,
        payload.response_url
      );
      if (retried) {
        return c.json({ ok: true });
      }
    }

    await updateFeedbackMessage(ctx, payload.message, payload.response_url);
    return c.json({ ok: true });
  }

  await handleHomeAction(actionId, action.value, ctx);
  return c.json({ ok: true });
}

export async function handleViewSubmission(
  c: Context,
  payload: ViewSubmissionPayload,
  ctx: HandlerContext
) {
  const callbackId = payload.view.callback_id;

  if (callbackId === "configure_channel") {
    await handleConfigureChannelSubmission(ctx, payload);
    return c.json({ response_action: "clear" });
  }

  if (callbackId === "home_settings") {
    const settings = extractSettingsFromSubmission(payload.view.state.values);
    const client = await getSlackClient(ctx.connectorId, ctx.teamId);
    await handleSaveSettings(
      { client, userId: ctx.userId, teamId: ctx.teamId, settings },
      { stateStore: createStateStore() }
    );
    return c.json({ response_action: "clear" });
  }

  if (callbackId === "digest_config_modal") {
    await handleDigestConfigSubmission(ctx, payload);
    const client = await getSlackClient(ctx.connectorId, ctx.teamId);
    const values = payload.view.state.values;
    const deliveryTime =
      extractSelectValue(values, "time", "time_select") ?? "09:00";
    const timezone =
      extractSelectValue(values, "timezone", "timezone_select") ?? "UTC";
    const frequency =
      extractSelectValue(values, "frequency", "frequency_select") ?? "daily";
    await client.call("chat.postMessage", {
      channel: payload.user.id,
      text: `Digest configured! You'll receive your ${frequency} digest at ${deliveryTime} (${timezone}).`,
    });

    return c.json({ response_action: "clear" });
  }

  if (callbackId === "global_search_submit") {
    const query = extractTextValue(
      payload.view.state.values,
      "query",
      "query_input"
    );
    if (query?.trim()) {
      const client = await getSlackClient(ctx.connectorId, ctx.teamId);
      await executeGlobalSearch(client, ctx, query.trim());
    }
    return c.json({ response_action: "clear" });
  }

  if (callbackId === "global_ask_submit") {
    const question = extractTextValue(
      payload.view.state.values,
      "question",
      "question_input"
    );
    if (question?.trim()) {
      logger.info(
        { connectorId: ctx.connectorId, userId: ctx.userId },
        "Global ask submitted"
      );
    }
    return c.json({ response_action: "clear" });
  }

  return c.json({ response_action: "clear" });
}

export async function handleMessageShortcut(
  c: Context,
  payload: MessageShortcutPayload,
  ctx: HandlerContext
) {
  const callbackId = payload.callback_id;
  logger.info({ callbackId, ctx }, "Handling message shortcut");

  try {
    const client = await getSlackClient(ctx.connectorId, ctx.teamId);

    if (callbackId === SHORTCUT_CALLBACK_IDS.SAVE_TO_OPENBEAM) {
      logger.info(
        {
          connectorId: ctx.connectorId,
          teamId: ctx.teamId,
          userId: ctx.userId,
        },
        "Processing save to OpenBeam shortcut"
      );
      const result = await handleSaveShortcut(client, payload, {
        saveStore: createSaveStore(ctx.teamId),
      });
      logger.info({ result }, "Save shortcut result");
      if (result.success) {
        await client.call("chat.postEphemeral", {
          channel: ctx.userId,
          user: ctx.userId,
          text: "✅ Message saved to OpenBeam!",
        });
      } else if (result.error) {
        await client.call("chat.postEphemeral", {
          channel: ctx.userId,
          user: ctx.userId,
          text: `⚠️ ${result.error}`,
        });
      }
      return c.json({ ok: true });
    }

    if (callbackId === SHORTCUT_CALLBACK_IDS.SUMMARIZE_THREAD) {
      await handleSummarizeShortcut(client, payload, {
        ragService: createRagService(),
      });
      return c.json({ ok: true });
    }

    if (callbackId === SHORTCUT_CALLBACK_IDS.SEARCH_CONTEXT) {
      await handleSearchContextShortcut(client, payload, [], {
        searchService: createSearchService(),
        ragService: createRagService(),
      });
      return c.json({ ok: true });
    }

    return c.json({ ok: true });
  } catch (error) {
    logger.error({ error, callbackId, ctx }, "Message shortcut error");
    return c.json({ ok: true });
  }
}

export async function handleGlobalShortcut(
  c: Context,
  payload: GlobalShortcutPayload,
  ctx: HandlerContext
) {
  const client = await getSlackClient(ctx.connectorId, ctx.teamId);
  const callbackId = payload.callback_id;

  if (callbackId === "global_search") {
    await client.call("views.open", {
      trigger_id: payload.trigger_id,
      view: buildSearchModal(),
    });
    return c.json({ ok: true });
  }

  if (callbackId === "global_ask") {
    await client.call("views.open", {
      trigger_id: payload.trigger_id,
      view: buildAskModal(),
    });
    return c.json({ ok: true });
  }

  return c.json({ ok: true });
}

async function handleDigestConfigSubmission(
  ctx: HandlerContext,
  payload: ViewSubmissionPayload
): Promise<void> {
  const values = payload.view.state.values;
  const topicsRaw = extractTextValue(values, "topics", "topics_input");
  const deliveryTime =
    extractSelectValue(values, "time", "time_select") ?? "09:00";
  const timezone =
    extractSelectValue(values, "timezone", "timezone_select") ?? "UTC";
  const frequency = (extractSelectValue(
    values,
    "frequency",
    "frequency_select"
  ) ?? "daily") as "daily" | "weekly";
  const channelIds = extractMultiSelectValue(
    values,
    "channels",
    "channels_select"
  );
  const topics =
    topicsRaw
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];

  await upsertSlackDigestSubscription(prisma, {
    connectorId: ctx.connectorId,
    userId: ctx.userId,
    slackUserId: payload.user.id,
    channelIds,
    topics,
    deliveryTime,
    timezone,
    frequency,
    enabled: true,
  });

  logger.info(
    { connectorId: ctx.connectorId, userId: ctx.userId, frequency },
    "Digest config saved"
  );
}

async function handleConfigureChannelSubmission(
  ctx: HandlerContext,
  payload: ViewSubmissionPayload
): Promise<void> {
  const metadata = parsePrivateMetadata(payload.view.private_metadata);
  const values = payload.view.state.values;
  const channelId = metadata.channelId ?? "";

  let channelName: string | undefined;
  if (channelId) {
    try {
      const client = await getSlackClient(ctx.connectorId, ctx.teamId);
      const channelInfo = await client.call<{
        ok: boolean;
        channel?: { name?: string };
      }>("conversations.info", { channel: channelId });
      channelName = channelInfo.channel?.name;
    } catch {
      logger.debug({ channelId }, "Could not fetch channel name");
    }
  }

  await upsertSlackChannelConfig(prisma, {
    connectorId: ctx.connectorId,
    channelId,
    channelName,
    responseMode: extractSelectValue(
      values,
      "response_mode",
      "response_mode_select"
    ),
    reactionsEnabled: extractCheckboxValue(
      values,
      "reactions_enabled",
      "reactions_checkbox"
    ),
    respondToWorkflows: extractCheckboxValue(
      values,
      "workflows",
      "workflows_checkbox"
    ),
    configuredBy: ctx.userId,
  });
}
