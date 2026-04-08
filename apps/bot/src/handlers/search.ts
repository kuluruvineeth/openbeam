import { hybridSearch } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { stripCommandPrefix } from "./utils";

const MAX_RESULTS = 5;

export async function handleSearch(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const query = extractQuery(message.text, message.command);

  if (query.length < 3) {
    return {
      type: "error",
      text: "Query too short. Please provide at least 3 characters.",
    };
  }

  const searchResult = await hybridSearch({
    query,
    teamId: identity.teamId,
    limit: MAX_RESULTS,
  });

  if (searchResult.documents.length === 0) {
    return {
      type: "text",
      text: `No results found for "${query}".`,
    };
  }

  return {
    type: "search_results",
    text: `Found ${searchResult.documents.length} results for "${query}"`,
    title: `Search: ${query}`,
    results: searchResult.documents.map((doc) => ({
      title: doc.title ?? "Untitled",
      snippet: doc.content?.slice(0, 200) ?? "",
      url: doc.url,
      source: doc.connector_type ?? "unknown",
      score: doc.relevanceScore,
    })),
  };
}

function extractQuery(text: string, command?: string): string {
  return stripCommandPrefix(text, command ?? "search");
}
