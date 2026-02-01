import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../workflows/types";
import type {
  ConnectorRecord,
  ConnectorSyncActivities,
  FetchBatchInput,
  FetchBatchOutput,
} from "./types";

export type SyncGenerator = (
  connector: ConnectorRecord,
  cursor?: SyncCursor
) => AsyncGenerator<{ items: unknown[]; cursor?: SyncCursor }>;

export function createFetchBatchActivity(
  connectorType: string,
  syncFn: SyncGenerator
): ConnectorSyncActivities {
  return {
    async fetchBatch(input: FetchBatchInput): Promise<FetchBatchOutput> {
      if (input.connector.type !== connectorType) {
        throw ApplicationFailure.nonRetryable(
          `Connector type mismatch: expected ${connectorType}, got ${input.connector.type}`,
          "ConfigError"
        );
      }

      const generator = syncFn(input.connector, input.cursor);
      const { value, done } = await generator.next();

      if (done || !value) {
        return { items: [], hasMore: false };
      }

      return {
        items: value.items,
        nextCursor: value.cursor,
        hasMore: value.items.length >= input.batchSize,
      };
    },
  };
}
