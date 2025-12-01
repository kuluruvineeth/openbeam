import type { SlackClient } from "../client";
import {
  type SlackSearchMatch,
  SlackSearchMatchSchema,
  SlackSearchResponseSchema,
} from "../types";

export interface SearchMessagesOptions {
  count?: number;
  page?: number;
  sort?: "score" | "timestamp";
  sortDir?: "asc" | "desc";
  highlight?: boolean;
}

export interface SearchResult {
  matches: SlackSearchMatch[];
  total: number;
  page: number;
  pageCount: number;
  hasMore: boolean;
}

interface SearchMessagesResponse {
  ok: boolean;
  query?: string;
  messages?: {
    total?: number;
    pagination?: {
      total_count?: number;
      page?: number;
      per_page?: number;
      page_count?: number;
      first?: number;
      last?: number;
    };
    paging?: {
      count?: number;
      total?: number;
      page?: number;
      pages?: number;
    };
    matches?: unknown[];
  };
  error?: string;
}

export async function searchMessages(
  client: SlackClient,
  query: string,
  options: SearchMessagesOptions = {}
): Promise<SearchResult> {
  const {
    count = 20,
    page = 1,
    sort = "score",
    sortDir = "desc",
    highlight = false,
  } = options;

  const response = await client.call<SearchMessagesResponse>(
    "search.messages",
    {
      query,
      count: Math.min(count, 100),
      page,
      sort,
      sort_dir: sortDir,
      highlight,
    }
  );

  const parsed = SlackSearchResponseSchema.safeParse(response);

  if (!(parsed.success && response.messages)) {
    return {
      matches: [],
      total: 0,
      page: 1,
      pageCount: 0,
      hasMore: false,
    };
  }

  const messages = response.messages;
  const rawMatches = messages.matches ?? [];

  const matches: SlackSearchMatch[] = [];
  for (const rawMatch of rawMatches) {
    const matchParsed = SlackSearchMatchSchema.safeParse(rawMatch);
    if (matchParsed.success) {
      matches.push(matchParsed.data);
    }
  }

  const pagination = messages.pagination ?? messages.paging ?? {};
  const total =
    (pagination as { total_count?: number }).total_count ??
    (pagination as { total?: number }).total ??
    0;
  const pageCount =
    (pagination as { page_count?: number }).page_count ??
    (pagination as { pages?: number }).pages ??
    0;

  return {
    matches,
    total,
    page,
    pageCount,
    hasMore: page < pageCount,
  };
}

export async function* searchMessagesAll(
  client: SlackClient,
  query: string,
  options: SearchMessagesOptions & { maxResults?: number } = {}
): AsyncGenerator<SlackSearchMatch, void, undefined> {
  const { maxResults = 1000, ...searchOptions } = options;

  let page = 1;
  let yielded = 0;

  while (yielded < maxResults) {
    const result = await searchMessages(client, query, {
      ...searchOptions,
      page,
    });

    for (const match of result.matches) {
      if (yielded >= maxResults) {
        return;
      }
      yield match;
      yielded += 1;
    }

    if (!result.hasMore) {
      break;
    }

    page += 1;
  }
}

export function buildSearchQuery(
  text: string,
  filters: SearchQueryFilters = {}
): string {
  const parts = [text];

  if (filters.inChannel) {
    parts.push(`in:${filters.inChannel}`);
  }

  if (filters.inChannels && filters.inChannels.length > 0) {
    for (const channel of filters.inChannels) {
      parts.push(`in:${channel}`);
    }
  }

  if (filters.from) {
    parts.push(`from:<@${filters.from}>`);
  }

  if (filters.after) {
    parts.push(`after:${filters.after}`);
  }

  if (filters.before) {
    parts.push(`before:${filters.before}`);
  }

  if (filters.on) {
    parts.push(`on:${filters.on}`);
  }

  if (filters.hasLink) {
    parts.push("has:link");
  }

  if (filters.hasFile) {
    parts.push("has:file");
  }

  if (filters.hasReaction) {
    parts.push("has:reaction");
  }

  if (filters.hasStar) {
    parts.push("has:star");
  }

  if (filters.isThread) {
    parts.push("is:thread");
  }

  return parts.join(" ");
}

export interface SearchQueryFilters {
  inChannel?: string;
  inChannels?: string[];
  from?: string;
  after?: string;
  before?: string;
  on?: string;
  hasLink?: boolean;
  hasFile?: boolean;
  hasReaction?: boolean;
  hasStar?: boolean;
  isThread?: boolean;
}

export function groupMatchesByChannel(
  matches: SlackSearchMatch[]
): Map<string, SlackSearchMatch[]> {
  const grouped = new Map<string, SlackSearchMatch[]>();

  for (const match of matches) {
    const channelId = match.channel?.id ?? "unknown";
    const existing = grouped.get(channelId) ?? [];
    existing.push(match);
    grouped.set(channelId, existing);
  }

  return grouped;
}

export function sortMatchesByTimestamp(
  matches: SlackSearchMatch[],
  direction: "asc" | "desc" = "desc"
): SlackSearchMatch[] {
  return [...matches].sort((a, b) => {
    const diff = Number(a.ts) - Number(b.ts);
    return direction === "asc" ? diff : -diff;
  });
}

export function extractChannelIds(matches: SlackSearchMatch[]): string[] {
  const channelIds = new Set<string>();

  for (const match of matches) {
    if (match.channel?.id) {
      channelIds.add(match.channel.id);
    }
  }

  return Array.from(channelIds);
}

export function extractUserIds(matches: SlackSearchMatch[]): string[] {
  const userIds = new Set<string>();

  for (const match of matches) {
    if (match.user) {
      userIds.add(match.user);
    }
  }

  return Array.from(userIds);
}
