import type { GenericDocument } from "@openplane/vespa";
import {
  buildSearchQuery,
  type SearchQueryFilters,
  searchMessages,
} from "../api/search";
import { createUserLookup, type UserLookup } from "../api/users";
import type { SlackClient } from "../client";
import type {
  FederatedSearchOptions,
  SlackSearchMatch,
  TransformContext,
} from "../types";
import {
  buildChannelFilterQuery,
  type ChannelFilterConfig,
  filterSearchMatches,
} from "./filter";

export interface FederatedSearchResult {
  documents: GenericDocument[];
  totalCount: number;
  query: string;
  duration: number;
  stats: {
    matchesFound: number;
    matchesFiltered: number;
    matchesReturned: number;
  };
}

export interface FullFederatedSearchOptions extends FederatedSearchOptions {
  userLookup?: UserLookup;
  fetchUsers?: boolean;
}

export async function federatedSearch(
  client: SlackClient,
  context: TransformContext,
  query: string,
  options: FullFederatedSearchOptions = {}
): Promise<FederatedSearchResult> {
  const startTime = Date.now();

  const {
    limit = 25,
    page = 1,
    sort = "score",
    sortDir = "desc",
    channelFilter = [],
    channelExclude = [],
    includeGroupDms = false,
    maxAgeDays = 30,
    userLookup: providedUserLookup,
    fetchUsers = true,
  } = options;

  const filterConfig: ChannelFilterConfig = {
    include: channelFilter,
    exclude: channelExclude,
    includeGroupDms,
    includeDirectMessages: false,
  };

  const queryFilters: SearchQueryFilters = {};

  if (maxAgeDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    queryFilters.after = cutoffDate.toISOString().split("T")[0];
  }

  const channelQueryPart = buildChannelFilterQuery(filterConfig);
  const fullQuery = channelQueryPart
    ? `${query} ${channelQueryPart}`
    : buildSearchQuery(query, queryFilters);

  let userLookup = providedUserLookup;
  if (!userLookup && fetchUsers) {
    userLookup = await createUserLookup(client);
  }

  const searchResult = await searchMessages(client, fullQuery, {
    count: limit * 2,
    page,
    sort,
    sortDir,
  });

  const filteredMatches = filterSearchMatches(
    searchResult.matches,
    filterConfig
  );

  const limitedMatches = filteredMatches.slice(0, limit);

  const documents = limitedMatches.map((match) =>
    transformSearchMatch(match, context, userLookup)
  );

  const duration = Date.now() - startTime;

  return {
    documents,
    totalCount: searchResult.total,
    query: fullQuery,
    duration,
    stats: {
      matchesFound: searchResult.matches.length,
      matchesFiltered: searchResult.matches.length - filteredMatches.length,
      matchesReturned: documents.length,
    },
  };
}

export async function* federatedSearchStream(
  client: SlackClient,
  context: TransformContext,
  query: string,
  options: FullFederatedSearchOptions & { maxResults?: number } = {}
): AsyncGenerator<GenericDocument, void, undefined> {
  const { maxResults = 100, ...searchOptions } = options;

  let page = 1;
  let yielded = 0;

  let userLookup = options.userLookup;
  if (!userLookup && options.fetchUsers !== false) {
    userLookup = await createUserLookup(client);
  }

  while (yielded < maxResults) {
    const result = await federatedSearch(client, context, query, {
      ...searchOptions,
      page,
      userLookup,
      fetchUsers: false,
    });

    for (const doc of result.documents) {
      if (yielded >= maxResults) {
        return;
      }
      yield doc;
      yielded += 1;
    }

    if (result.stats.matchesReturned === 0) {
      break;
    }

    page += 1;

    if (page > 10) {
      break;
    }
  }
}

function transformSearchMatch(
  match: SlackSearchMatch,
  context: TransformContext,
  userLookup?: UserLookup
): GenericDocument {
  const { connectorId, connectorType, teamId, workspaceId } = context;

  const channelId = match.channel?.id ?? "unknown";
  const channelName = match.channel?.name ?? "unknown";
  const isPrivate = match.channel?.is_private ?? false;

  const createdAt = slackTsToMs(match.ts);

  const authorId = match.user;
  const authorName = authorId ? userLookup?.getName(authorId) : match.username;

  const documentId = `${connectorId}_${channelId}_${match.ts}`;

  return {
    id: documentId,
    connector_id: connectorId,
    connector_type: connectorType,
    team_id: teamId,
    workspace_id: workspaceId,
    external_id: match.ts,
    document_type: "message",
    title: `Message in #${channelName}`,
    content: match.text,
    author_id: authorId,
    author_name: authorName,
    created_at: createdAt,
    updated_at: createdAt,
    source_id: channelId,
    source_name: channelName,
    source_type: "channel",
    url: match.permalink,
    is_public: !isPrivate,
    metadata: {
      federated: true,
      team: match.team,
    },
  };
}

function slackTsToMs(ts: string): number {
  return Math.floor(Number.parseFloat(ts) * 1000);
}

export async function quickSearch(
  client: SlackClient,
  context: TransformContext,
  query: string,
  limit = 10
): Promise<GenericDocument[]> {
  const result = await federatedSearch(client, context, query, { limit });
  return result.documents;
}

export interface SearchInChannelsOptions
  extends Omit<FullFederatedSearchOptions, "channelFilter"> {
  channels: string[];
}

export function searchInChannels(
  client: SlackClient,
  context: TransformContext,
  query: string,
  options: SearchInChannelsOptions
): Promise<FederatedSearchResult> {
  const { channels, ...rest } = options;
  return federatedSearch(client, context, query, {
    ...rest,
    channelFilter: channels,
  });
}

export interface SearchInDateRangeOptions
  extends Omit<FullFederatedSearchOptions, "maxAgeDays"> {
  startDate: Date;
}

export function searchInDateRange(
  client: SlackClient,
  context: TransformContext,
  query: string,
  options: SearchInDateRangeOptions
): Promise<FederatedSearchResult> {
  const { startDate, ...rest } = options;
  const msPerDay = 24 * 60 * 60 * 1000;
  const maxAgeDays = Math.ceil((Date.now() - startDate.getTime()) / msPerDay);

  return federatedSearch(client, context, query, {
    ...rest,
    maxAgeDays,
  });
}
