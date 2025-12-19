import type { KnownBlock } from "@slack/web-api";
import type { SlackClient } from "../client";
import {
  buildPromptQuery,
  getContextualPrompts,
  getPromptById,
} from "./prompts";
import type {
  SidebarContext,
  SidebarPrompt,
  SidebarResponse,
  SidebarSuggestion,
  ThreadContext,
} from "./types";
import { SIDEBAR_CALLBACK_IDS } from "./types";

interface AssistantThreadsSetSuggestedPromptsResponse {
  ok: boolean;
  error?: string;
}

interface AssistantThreadsSetTitleResponse {
  ok: boolean;
  error?: string;
}

interface AssistantThreadsSetStatusResponse {
  ok: boolean;
  error?: string;
}

interface SearchProvider {
  search(params: {
    query: string;
    teamId: string;
    accessControlIds: string[];
    limit: number;
    sourceId?: string;
  }): Promise<{
    documents: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      documentType?: string;
    }>;
  }>;
}

interface RagProvider {
  answer(params: {
    query: string;
    teamId: string;
    accessControlIds: string[];
    topK: number;
    systemPrompt?: string;
    sourceId?: string;
  }): Promise<{
    answer: string;
    citations: Array<{
      title: string;
      url?: string;
    }>;
  }>;
}

export interface SidebarHandlerDeps {
  searchService: SearchProvider;
  ragService: RagProvider;
}

export async function setSuggestedPrompts(
  client: SlackClient,
  context: ThreadContext,
  prompts: SidebarPrompt[]
): Promise<boolean> {
  const formattedPrompts = prompts.slice(0, 4).map((p) => ({
    title: p.label,
    message: p.query || p.description || p.label,
  }));

  const result = await client.call<AssistantThreadsSetSuggestedPromptsResponse>(
    "assistant.threads.setSuggestedPrompts",
    {
      channel_id: context.channelId,
      thread_ts: context.threadTs,
      prompts: formattedPrompts,
    }
  );

  return result.ok;
}

export async function setThreadTitle(
  client: SlackClient,
  context: ThreadContext,
  title: string
): Promise<boolean> {
  const result = await client.call<AssistantThreadsSetTitleResponse>(
    "assistant.threads.setTitle",
    {
      channel_id: context.channelId,
      thread_ts: context.threadTs,
      title: truncate(title, 255),
    }
  );

  return result.ok;
}

export async function setThreadStatus(
  client: SlackClient,
  context: ThreadContext,
  status: string
): Promise<boolean> {
  const result = await client.call<AssistantThreadsSetStatusResponse>(
    "assistant.threads.setStatus",
    {
      channel_id: context.channelId,
      thread_ts: context.threadTs,
      status,
    }
  );

  return result.ok;
}

export interface SidebarPromptSelectParams {
  promptId: string;
  context: SidebarContext;
  accessControlIds: string[];
}

export async function handleSidebarPromptSelect(
  params: SidebarPromptSelectParams,
  deps: SidebarHandlerDeps
): Promise<SidebarResponse | null> {
  const { promptId, context, accessControlIds } = params;
  const prompt = getPromptById(promptId);
  if (!prompt) {
    return null;
  }

  const query = buildPromptQuery(prompt, context);

  const result = await deps.ragService.answer({
    query,
    teamId: context.teamId,
    accessControlIds,
    topK: 5,
    sourceId: context.channelId,
  });

  const searchResults = await deps.searchService.search({
    query,
    teamId: context.teamId,
    accessControlIds,
    limit: 3,
    sourceId: context.channelId,
  });

  const suggestions: SidebarSuggestion[] = searchResults.documents.map(
    (doc, idx) => ({
      id: `suggestion_${idx}`,
      title: doc.title ?? "Untitled",
      preview: doc.content ? truncate(doc.content, 100) : "",
      url: doc.url,
      documentType: doc.documentType,
      relevanceScore: doc.score ?? 0,
    })
  );

  return {
    content: result.answer,
    suggestions,
    sources: result.citations,
    promptUsed: prompt,
    generatedAt: new Date(),
  };
}

export interface SidebarSearchParams {
  query: string;
  context: SidebarContext;
  accessControlIds: string[];
}

export async function handleSidebarSearch(
  params: SidebarSearchParams,
  deps: SidebarHandlerDeps
): Promise<SidebarResponse | null> {
  const { query, context, accessControlIds } = params;
  const prompt: SidebarPrompt = {
    id: `search_${Date.now()}`,
    type: "knowledge_search",
    label: "Search",
    query,
  };

  const result = await deps.ragService.answer({
    query,
    teamId: context.teamId,
    accessControlIds,
    topK: 5,
    sourceId: context.channelId,
  });

  const searchResults = await deps.searchService.search({
    query,
    teamId: context.teamId,
    accessControlIds,
    limit: 5,
    sourceId: context.channelId,
  });

  const suggestions: SidebarSuggestion[] = searchResults.documents.map(
    (doc, idx) => ({
      id: `suggestion_${idx}`,
      title: doc.title ?? "Untitled",
      preview: doc.content ? truncate(doc.content, 100) : "",
      url: doc.url,
      documentType: doc.documentType,
      relevanceScore: doc.score ?? 0,
    })
  );

  return {
    content: result.answer,
    suggestions,
    sources: result.citations,
    promptUsed: prompt,
    generatedAt: new Date(),
  };
}

export function buildSidebarResponseBlocks(
  response: SidebarResponse
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncate(response.content, 2900),
      },
    },
  ];

  if (response.sources.length > 0) {
    const sourceLinks = response.sources
      .slice(0, 3)
      .map((s) => (s.url ? `<${s.url}|${truncate(s.title, 25)}>` : s.title))
      .join(" · ");

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📚 ${sourceLinks}`,
        },
      ],
    });
  }

  if (response.suggestions.length > 0) {
    blocks.push({ type: "divider" });

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Related:*",
      },
    });

    for (const suggestion of response.suggestions.slice(0, 3)) {
      const title = suggestion.url
        ? `<${suggestion.url}|${truncate(suggestion.title, 50)}>`
        : truncate(suggestion.title, 50);

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${title}\n${truncate(suggestion.preview, 80)}`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Open",
            emoji: true,
          },
          action_id: `${SIDEBAR_CALLBACK_IDS.SUGGESTION_CLICK}_${suggestion.id}`,
          url: suggestion.url,
        },
      });
    }
  }

  blocks.push({
    type: "actions",
    block_id: "sidebar_actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "👍 Helpful",
          emoji: true,
        },
        action_id: `${SIDEBAR_CALLBACK_IDS.FEEDBACK}_helpful`,
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "👎 Not helpful",
          emoji: true,
        },
        action_id: `${SIDEBAR_CALLBACK_IDS.FEEDBACK}_not_helpful`,
      },
    ],
  });

  return blocks;
}

export function buildSidebarPromptBlocks(
  context: SidebarContext
): KnownBlock[] {
  const prompts = getContextualPrompts(context);

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*What would you like to know?*",
      },
    },
  ];

  const promptButtons = prompts.slice(0, 4).map((p) => ({
    type: "button" as const,
    text: {
      type: "plain_text" as const,
      text: `${p.icon ?? ""} ${p.label}`.trim(),
      emoji: true,
    },
    action_id: `${SIDEBAR_CALLBACK_IDS.PROMPT_SELECT}_${p.id}`,
    value: p.id,
  }));

  blocks.push({
    type: "actions",
    block_id: "prompt_select",
    elements: promptButtons,
  });

  blocks.push({
    type: "input",
    block_id: "custom_search",
    dispatch_action: true,
    element: {
      type: "plain_text_input",
      action_id: SIDEBAR_CALLBACK_IDS.SEARCH_SUBMIT,
      placeholder: {
        type: "plain_text",
        text: "Or type your question...",
      },
    },
    label: {
      type: "plain_text",
      text: " ",
    },
  });

  return blocks;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}
