import type { KnownBlock, View } from "@slack/web-api";
import type { SlackClient } from "../client";
import type { MessageShortcutPayload } from "../interactivity/types";
import type { MessageContext, ShortcutResult } from "./types";

const SENTENCE_SPLIT_REGEX = /[.!?]+/;

interface ChatPostEphemeralResponse {
  ok: boolean;
  message_ts?: string;
  error?: string;
}

interface ViewsOpenResponse {
  ok: boolean;
  view?: { id: string };
  error?: string;
}

interface SearchProvider {
  search(params: {
    query: string;
    teamId: string;
    accessControlIds: string[];
    limit: number;
  }): Promise<{
    documents: Array<{
      title?: string;
      url?: string;
      content?: string;
      source_name?: string;
    }>;
    total: number;
  }>;
}

interface RagProvider {
  answer(params: {
    query: string;
    teamId: string;
    accessControlIds: string[];
    topK: number;
  }): Promise<{
    answer: string;
    citations: Array<{ title: string; url?: string }>;
  }>;
}

export interface SearchContextDeps {
  searchService: SearchProvider;
  ragService: RagProvider;
}

export async function handleSearchContextShortcut(
  client: SlackClient,
  payload: MessageShortcutPayload,
  accessControlIds: string[],
  deps: SearchContextDeps
): Promise<ShortcutResult> {
  const context = extractMessageContext(payload, client.teamId ?? "");

  if (!context.messageText || context.messageText.trim().length < 3) {
    return {
      success: false,
      error: "Message is too short to use as search context",
    };
  }

  const query = extractSearchQuery(context.messageText);

  const [searchResults, ragResult] = await Promise.all([
    deps.searchService.search({
      query,
      teamId: context.teamId,
      accessControlIds,
      limit: 5,
    }),
    deps.ragService.answer({
      query,
      teamId: context.teamId,
      accessControlIds,
      topK: 5,
    }),
  ]);

  const blocks = buildContextSearchBlocks(
    context.messageText,
    searchResults,
    ragResult
  );

  await client.call<ChatPostEphemeralResponse>("chat.postEphemeral", {
    channel: context.channelId,
    user: context.userId,
    text: ragResult.answer,
    blocks,
    thread_ts: context.threadTs ?? context.messageTs,
  });

  return {
    success: true,
    message: "Search completed",
    data: {
      query,
      resultCount: searchResults.total,
    },
  };
}

export async function openSearchContextModal(
  client: SlackClient,
  triggerId: string,
  context: MessageContext
): Promise<boolean> {
  const modal = buildSearchContextModal(context);

  const result = await client.call<ViewsOpenResponse>("views.open", {
    trigger_id: triggerId,
    view: modal,
  });

  return result.ok;
}

export function buildSearchContextModal(context: MessageContext): View {
  const suggestedQuery = extractSearchQuery(context.messageText ?? "");

  return {
    type: "modal",
    callback_id: "search_context_submit",
    private_metadata: JSON.stringify({
      channelId: context.channelId,
      messageTs: context.messageTs,
      originalText: context.messageText,
    }),
    title: {
      type: "plain_text",
      text: "Search with Context",
    },
    submit: {
      type: "plain_text",
      text: "Search",
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
          text: "*Use this message as context to search*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_Original message:_\n>${truncate(context.messageText ?? "", 150)}`,
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "search_query",
        element: {
          type: "plain_text_input",
          action_id: "query_input",
          initial_value: suggestedQuery,
          placeholder: {
            type: "plain_text",
            text: "Enter your search query...",
          },
        },
        label: {
          type: "plain_text",
          text: "Search Query",
        },
      },
      {
        type: "input",
        block_id: "search_scope",
        optional: true,
        element: {
          type: "static_select",
          action_id: "scope_select",
          initial_option: {
            text: { type: "plain_text", text: "All sources" },
            value: "all",
          },
          options: [
            {
              text: { type: "plain_text", text: "All sources" },
              value: "all",
            },
            {
              text: { type: "plain_text", text: "This channel only" },
              value: "channel",
            },
            {
              text: { type: "plain_text", text: "Slack only" },
              value: "slack",
            },
            {
              text: { type: "plain_text", text: "Files only" },
              value: "files",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: "Search Scope",
        },
      },
      {
        type: "input",
        block_id: "include_answer",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "answer_checkbox",
          initial_options: [
            {
              text: { type: "plain_text", text: "Include AI-generated answer" },
              value: "include_answer",
            },
          ],
          options: [
            {
              text: { type: "plain_text", text: "Include AI-generated answer" },
              value: "include_answer",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: "Options",
        },
      },
    ],
  };
}

function buildContextSearchBlocks(
  originalText: string,
  searchResults: {
    documents: Array<{
      title?: string;
      url?: string;
      content?: string;
      source_name?: string;
    }>;
    total: number;
  },
  ragResult: {
    answer: string;
    citations: Array<{ title: string; url?: string }>;
  }
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔍 *Search based on:*\n>${truncate(originalText, 100)}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Answer:*\n${truncate(ragResult.answer, 1500)}`,
      },
    },
  ];

  if (ragResult.citations.length > 0) {
    const citationLinks = ragResult.citations
      .slice(0, 3)
      .map((c) => (c.url ? `<${c.url}|${truncate(c.title, 25)}>` : c.title))
      .join(" · ");

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📚 ${citationLinks}`,
        },
      ],
    });
  }

  if (searchResults.documents.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Related Results (${searchResults.total} found):*`,
      },
    });

    for (const doc of searchResults.documents.slice(0, 3)) {
      const title = doc.url
        ? `<${doc.url}|${truncate(doc.title ?? "Untitled", 50)}>`
        : truncate(doc.title ?? "Untitled", 50);

      const snippet = doc.content ? `\n${truncate(doc.content, 80)}` : "";
      const source = doc.source_name ? ` · 📁 ${doc.source_name}` : "";

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${title}${snippet}${source}`,
        },
      });
    }
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Share Answer",
          emoji: true,
        },
        action_id: "share_context_answer",
        style: "primary",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Refine Search",
          emoji: true,
        },
        action_id: "refine_search",
      },
    ],
  });

  return blocks;
}

function extractSearchQuery(text: string): string {
  let clean = text
    .replace(/<@[A-Z0-9]+>/gi, "")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/gi, "$1")
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/gi, "$2")
    .replace(/<(https?:\/\/[^>]+)>/gi, "")
    .replace(/<!([^>]+)>/gi, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = clean.split(SENTENCE_SPLIT_REGEX);
  if (sentences.length > 2) {
    clean = sentences.slice(0, 2).join(". ");
  }

  return truncate(clean, 200);
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
