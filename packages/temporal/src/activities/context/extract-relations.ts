import { ExtractRelationsInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { ExtractRelationsOutput } from "./types";

export interface ExtractRelationsDependencies {
  db: unknown;
}

export function createExtractRelationsActivity(
  _deps: ExtractRelationsDependencies
) {
  return {
    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async extractRelationsFromDocuments(
      rawInput: unknown
    ): Promise<ExtractRelationsOutput> {
      const input = ExtractRelationsInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "extracting-relations",
        teamId: input.teamId,
        documentCount: input.documentIds.length,
      });

      return { relationsCreated: 0 };
    },
  };
}
