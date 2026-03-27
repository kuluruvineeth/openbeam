import { IngestSyncBatchInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { IngestSyncBatchOutput } from "./types";

export interface IngestFromSyncDependencies {
  db: unknown;
}

export function createIngestFromSyncActivity(
  _deps: IngestFromSyncDependencies
) {
  return {
    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async ingestSyncBatchToContext(
      rawInput: unknown
    ): Promise<IngestSyncBatchOutput> {
      const input = IngestSyncBatchInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "ingesting",
        teamId: input.teamId,
        connectorId: input.connectorId,
        documentCount: input.documentIds.length,
      });

      return { created: 0, updated: 0 };
    },
  };
}
