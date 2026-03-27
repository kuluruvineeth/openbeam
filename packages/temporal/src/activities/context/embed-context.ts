import { EmbedContextInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { EmbedContextOutput } from "./types";

export interface EmbedContextDependencies {
  db: unknown;
}

export function createEmbedContextActivity(_deps: EmbedContextDependencies) {
  return {
    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async embedContextEntry(rawInput: unknown): Promise<EmbedContextOutput> {
      const input = EmbedContextInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "embedding",
        uri: input.uri,
        teamId: input.teamId,
      });

      return { indexed: true };
    },
  };
}
