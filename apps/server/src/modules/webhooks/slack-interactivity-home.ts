import prisma, {
  findSlackDigestSubscription,
  listConnectorsByTeam,
} from "@openplane/db";
import { createStateStore } from "@openplane/redis";
import {
  buildDigestConfigModal,
  buildUnifiedSearchResultBlocks,
  HOME_CALLBACK_IDS,
  handleClearRecentSearches,
  handleHomeSearch,
  handleOpenSettings,
  handleRemoveSavedItem,
  refreshHomeTab,
  searchService,
} from "@openplane/services";
import logger from "../../utils/logger";
import type {
  HandlerContext,
  HomeTabState,
  SavedItem,
  SlackClient,
} from "./slack-interactivity-types";
import { getSlackClient } from "./slack-interactivity-utils";

const QUICK_ACTION_CONNECTORS = `${HOME_CALLBACK_IDS.QUICK_ACTION}_view_connectors`;

export async function handleHomeAction(
  actionId: string,
  value: string | undefined,
  ctx: HandlerContext
): Promise<void> {
  const client = await getSlackClient(ctx.connectorId, ctx.teamId);
  const deps = { stateStore: createStateStore() };

  if (actionId === HOME_CALLBACK_IDS.SEARCH_INPUT) {
    if (value?.trim()) {
      await handleHomeSearch(
        { userId: ctx.userId, teamId: ctx.teamId, query: value.trim() },
        deps
      );
    }
    return;
  }

  if (actionId === HOME_CALLBACK_IDS.CLEAR_RECENT) {
    await handleClearRecentSearches(client, ctx.userId, ctx.teamId, deps);
    return;
  }

  if (actionId === HOME_CALLBACK_IDS.SETTINGS) {
    if (!ctx.triggerId) {
      logger.warn({ ctx }, "Missing triggerId for settings modal");
      return;
    }
    await handleOpenSettings(
      {
        client,
        userId: ctx.userId,
        teamId: ctx.teamId,
        triggerId: ctx.triggerId,
      },
      deps
    );
    return;
  }

  if (actionId.startsWith(HOME_CALLBACK_IDS.REMOVE_SAVED)) {
    const itemId = actionId.replace(`${HOME_CALLBACK_IDS.REMOVE_SAVED}_`, "");
    await handleRemoveSavedItem(
      { client, userId: ctx.userId, teamId: ctx.teamId, itemId },
      deps
    );
    return;
  }

  if (actionId === HOME_CALLBACK_IDS.VIEW_ALL_SAVED) {
    await showAllSavedItems(client, ctx, deps);
    return;
  }

  if (actionId === QUICK_ACTION_CONNECTORS) {
    await showConnectorsMessage(client, ctx);
    return;
  }

  if (actionId === HOME_CALLBACK_IDS.CONFIGURE_DIGEST) {
    await openDigestModal(client, ctx, ctx.userId);
    return;
  }

  if (actionId === HOME_CALLBACK_IDS.REFRESH) {
    const stateKey = `home_state:${ctx.teamId}:${ctx.userId}`;
    const state = await deps.stateStore.get<HomeTabState>(stateKey);
    if (!state) {
      logger.warn({ ctx }, "No state found for home tab refresh");
      return;
    }
    await refreshHomeTab(client, ctx.userId, state);
    return;
  }

  logger.debug({ actionId, value }, "Unhandled home action");
}

export async function openDigestModal(
  client: SlackClient,
  ctx: HandlerContext,
  slackUserId: string
): Promise<void> {
  if (!ctx.triggerId) {
    logger.error({ ctx }, "Missing triggerId for digest modal");
    return;
  }

  const existing = await findSlackDigestSubscription(
    prisma,
    ctx.connectorId,
    slackUserId
  );

  const modal = buildDigestConfigModal(
    existing
      ? {
          channelIds: existing.channelIds,
          topics: existing.topics,
          frequency: existing.frequency,
          deliveryTime: existing.deliveryTime,
          timezone: existing.timezone,
        }
      : undefined
  );

  const result = await client.call("views.open", {
    trigger_id: ctx.triggerId,
    view: modal,
  });
  logger.debug({ result }, "Digest modal open result");
}

async function showAllSavedItems(
  client: SlackClient,
  ctx: HandlerContext,
  deps: { stateStore: ReturnType<typeof createStateStore> }
): Promise<void> {
  const stateKey = `home_state:${ctx.teamId}:${ctx.userId}`;
  const state = await deps.stateStore.get<HomeTabState>(stateKey);
  const savedItems: SavedItem[] = state?.savedItems ?? [];

  if (savedItems.length === 0) {
    await client.call("chat.postEphemeral", {
      channel: ctx.userId,
      user: ctx.userId,
      text: "You don't have any saved items yet. Use the message shortcut to save items.",
    });
    return;
  }

  const itemLines = savedItems.map((item, index) => {
    const title = item.url ? `<${item.url}|${item.title}>` : item.title;
    const source = item.source ? ` · ${item.source}` : "";
    return `${index + 1}. ${title}${source}`;
  });

  await client.call("chat.postEphemeral", {
    channel: ctx.userId,
    user: ctx.userId,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Your Saved Items (${savedItems.length})*\n\n${itemLines.join("\n")}`,
        },
      },
    ],
    text: `You have ${savedItems.length} saved items`,
  });
}

async function showConnectorsMessage(
  client: SlackClient,
  ctx: HandlerContext
): Promise<void> {
  const appUrl = process.env.WEB_APP_URL ?? "https://app.openplane.com";
  const connectors = await listConnectorsByTeam(prisma, ctx.teamId);

  const blocks: Array<{
    type: string;
    text?: { type: string; text: string };
    accessory?: {
      type: string;
      text: { type: string; text: string; emoji?: boolean };
      url?: string;
      action_id: string;
    };
    elements?: Array<{ type: string; text: string }>;
  }> = [];

  if (connectors.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Connected Apps*\n\nNo apps connected yet. Connect your first app to start searching across your tools.",
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Connect Apps", emoji: true },
        url: `${appUrl}/connectors`,
        action_id: "open_connectors_page",
      },
    });
  } else {
    const connectorList = connectors
      .map((c) => `• ${c.name} (${c.type})`)
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Connected Apps (${connectors.length})*\n\n${connectorList}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Manage", emoji: true },
        url: `${appUrl}/connectors`,
        action_id: "open_connectors_page",
      },
    });
  }

  await client.call("chat.postEphemeral", {
    channel: ctx.userId,
    user: ctx.userId,
    blocks,
    text: `You have ${connectors.length} connected apps`,
  });
}

export async function executeGlobalSearch(
  client: SlackClient,
  ctx: HandlerContext,
  query: string
): Promise<void> {
  const results = await searchService.searchUnified({
    query,
    teamId: ctx.teamId,
    limit: 10,
    includeDocuments: true,
    includeMedia: true,
    accessControlIds: [ctx.userId, `team:${ctx.teamId}`],
  });

  const blocks = buildUnifiedSearchResultBlocks(query, results);

  await client.call("chat.postEphemeral", {
    channel: ctx.userId,
    user: ctx.userId,
    blocks,
    text: `Search results for "${query}"`,
  });
}
