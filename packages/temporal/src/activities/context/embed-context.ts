import { EmbedContextInputSchema } from "@openbeam/types/temporal/workflows/context";
import type { VespaContextEntryForFeed } from "@openbeam/vespa";
import { Context } from "@temporalio/activity";
import type { EmbedContextOutput } from "./types";

export interface EmbedContextDependencies {
  embeddingService: {
    embed(text: string): Promise<{ embedding: number[] }>;
  };
  vespaClient: {
    feedContextEntry(doc: VespaContextEntryForFeed): Promise<unknown>;
  };
}

export function createEmbedContextActivity(deps: EmbedContextDependencies) {
  return {
    async embedContextEntry(rawInput: unknown): Promise<EmbedContextOutput> {
      const input = EmbedContextInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "embedding",
        uri: input.uri,
        teamId: input.teamId,
      });

      const textToEmbed = [input.abstractText, input.overview]
        .filter(Boolean)
        .join("\n\n");

      const { embedding } = await deps.embeddingService.embed(textToEmbed);

      await deps.vespaClient.feedContextEntry({
        id: input.uri,
        uri: input.uri,
        team_id: input.teamId,
        owner_id: "",
        owner_type: "team",
        context_type: "resource",
        is_leaf: true,
        abstract_text: input.abstractText,
        overview_text: input.overview ?? "",
        active_count: 0,
        updated_at: Date.now(),
        created_at: Date.now(),
        embedding,
      });

      return { indexed: true };
    },
  };
}
