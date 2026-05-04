import type { KnownBlock, View } from "@slack/web-api";
import type { SlackClient } from "../client";
import type { MessageShortcutPayload } from "../interactivity/types";
import type { MessageContext, SavedMessageData, ShortcutResult } from "./types";

interface ViewsOpenResponse {
  ok: boolean;
  view?: { id: string };
  error?: string;
}

interface ChatGetPermalinkResponse {
  ok: boolean;
  permalink?: string;
  error?: string;
}

interface SaveStore {
  save(userId: string, data: SavedMessageData): Promise<void>;
  exists(userId: string, messageTs: string): Promise<boolean>;
}

export interface SaveShortcutDeps {
  saveStore: SaveStore;
}

export async function handleSaveShortcut(
  client: SlackClient,
  payload: MessageShortcutPayload,
  deps: SaveShortcutDeps
): Promise<ShortcutResult> {
  const context = extractMessageContext(payload, client.teamId ?? "");

  const exists = await deps.saveStore.exists(context.userId, context.messageTs);
  if (exists) {
    return {
      success: false,
      error: "This message is already saved",
    };
  }

  const permalink = await getMessagePermalink(
    client,
    context.channelId,
    context.messageTs
  );

  const savedData: SavedMessageData = {
    id: `${context.channelId}_${context.messageTs}`,
    channelId: context.channelId,
    messageTs: context.messageTs,
    text: context.messageText ?? "",
    author: context.messageAuthor ?? "",
    url: permalink ?? "",
    savedAt: Date.now(),
  };

  await deps.saveStore.save(context.userId, savedData);

  return {
    success: true,
    message: "Message saved to OpenBeam!",
    data: savedData,
  };
}

export async function openSaveConfirmationModal(
  client: SlackClient,
  triggerId: string,
  context: MessageContext
): Promise<boolean> {
  const modal = buildSaveConfirmationModal(context);

  const result = await client.call<ViewsOpenResponse>("views.open", {
    trigger_id: triggerId,
    view: modal,
  });

  return result.ok;
}

export function buildSaveConfirmationModal(context: MessageContext): View {
  const preview = context.messageText
    ? truncate(context.messageText, 200)
    : "No text content";

  return {
    type: "modal",
    callback_id: "save_message_confirm",
    private_metadata: JSON.stringify({
      channelId: context.channelId,
      messageTs: context.messageTs,
    }),
    title: {
      type: "plain_text",
      text: "Save to OpenBeam",
    },
    submit: {
      type: "plain_text",
      text: "Save",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Save this message for quick access later*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_${preview}_`,
        },
      },
      {
        type: "input",
        block_id: "save_tags",
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "tags_input",
          placeholder: {
            type: "plain_text",
            text: "Add tags (comma-separated)",
          },
        },
        label: {
          type: "plain_text",
          text: "Tags",
        },
      },
      {
        type: "input",
        block_id: "save_notes",
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "notes_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Add a note (optional)",
          },
        },
        label: {
          type: "plain_text",
          text: "Notes",
        },
      },
    ],
  };
}

export function buildSaveSuccessBlocks(data: SavedMessageData): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "✅ *Message saved to OpenBeam*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_${truncate(data.text, 100)}_`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View in OpenBeam",
            emoji: true,
          },
          url: getOpenBeamUrl(data.id),
          action_id: "view_saved",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Undo",
            emoji: true,
          },
          action_id: `undo_save_${data.id}`,
        },
      ],
    },
  ];
}

async function getMessagePermalink(
  client: SlackClient,
  channel: string,
  messageTs: string
): Promise<string | undefined> {
  try {
    const result = await client.call<ChatGetPermalinkResponse>(
      "chat.getPermalink",
      {
        channel,
        message_ts: messageTs,
      }
    );
    return result.permalink;
  } catch {
    return;
  }
}

function extractMessageContext(
  payload: MessageShortcutPayload,
  teamId: string
): MessageContext {
  return {
    channelId: payload.channel.id,
    messageTs: payload.message.ts,
    threadTs: payload.message.thread_ts,
    userId: payload.user.id,
    messageText: payload.message.text,
    messageAuthor: payload.message.user,
    teamId,
    connectorId: "",
  };
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function getOpenBeamUrl(itemId: string): string {
  const baseUrl = process.env.WEB_APP_URL ?? "https://app.openbeam.work";
  return `${baseUrl}/saved/${itemId}`;
}
