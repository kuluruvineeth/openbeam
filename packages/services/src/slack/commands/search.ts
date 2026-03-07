import { searchService } from "../../search";
import { buildUnifiedSearchResultBlocks } from "../assistant/response-builder";
import type { SlashCommandPayload } from "../interactivity/types";
import type { CommandContext, CommandResult } from "./router";

export async function handleSearchCommand(
  payload: SlashCommandPayload,
  context: CommandContext
): Promise<CommandResult> {
  const query = payload.text.trim();

  if (!query) {
    return {
      response_type: "ephemeral",
      text: "Please provide a search query.\nUsage: `/openbeam search <query>`",
    };
  }

  try {
    const results = await searchService.searchUnified({
      query,
      teamId: context.teamId,
      accessControlIds: context.accessControlIds,
      limit: 8,
      includeDocuments: true,
      includeMedia: true,
    });

    if (results.total === 0) {
      return {
        response_type: "ephemeral",
        text: `No results found for "${query}"`,
      };
    }

    return {
      response_type: "ephemeral",
      blocks: buildUnifiedSearchResultBlocks(query, results),
    };
  } catch (error) {
    return {
      response_type: "ephemeral",
      text: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
