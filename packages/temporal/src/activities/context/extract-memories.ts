import { ExtractMemoriesInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { MemoryExtractionResult } from "./types";

export interface ExtractMemoriesDependencies {
  db: unknown;
}

export function createExtractMemoriesActivity(
  _deps: ExtractMemoriesDependencies
) {
  return {
    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async extractMemoriesFromSession(
      rawInput: unknown
    ): Promise<MemoryExtractionResult> {
      const input = ExtractMemoriesInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "extracting-memories",
        sessionId: input.sessionId,
        teamId: input.teamId,
      });

      return {
        memoriesCreated: 0,
        memoriesMerged: 0,
        memoriesSkipped: 0,
        categories: {},
      };
    },
  };
}
