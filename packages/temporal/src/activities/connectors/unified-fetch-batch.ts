import type { Database } from "@openplane/db";
import type { GenericDocument } from "@openplane/vespa";
import { heartbeat } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../workflows/types";
import type {
  ConnectorRecord,
  ConnectorSyncActivities,
  DiscoveredResourceRecord,
  FetchBatchInput,
  FetchBatchOutput,
} from "./types";

export interface UnifiedSyncDependencies {
  db: Database;
}

type SyncBatch = {
  items: GenericDocument[];
  cursor?: SyncCursor;
  hasMore?: boolean;
  discoveredResources?: DiscoveredResourceRecord[];
};

type SyncGenerator = AsyncGenerator<SyncBatch>;

type ConnectorSyncFactory = (
  connectorId: string,
  connector: ConnectorRecord,
  cursor?: SyncCursor
) => SyncGenerator;

const syncFactories = new Map<string, ConnectorSyncFactory>();
const activeGenerators = new Map<string, SyncGenerator>();

export function registerSyncFactory(
  connectorType: string,
  factory: ConnectorSyncFactory
): void {
  syncFactories.set(connectorType, factory);
}

function buildGeneratorKey(connector: ConnectorRecord): string {
  return `${connector.id}:${connector.type}`;
}

function getOrCreateGenerator(
  connector: ConnectorRecord,
  cursor?: SyncCursor
): SyncGenerator {
  const key = buildGeneratorKey(connector);
  const existing = activeGenerators.get(key);

  if (existing) {
    return existing;
  }

  const factory = syncFactories.get(connector.type);
  if (!factory) {
    const available = Array.from(syncFactories.keys()).join(", ");
    throw ApplicationFailure.nonRetryable(
      `No sync factory registered for connector type: ${connector.type}. Available: ${available}`,
      "ConfigError"
    );
  }

  const generator = factory(connector.id, connector, cursor);
  activeGenerators.set(key, generator);
  return generator;
}

function cleanupGenerator(connector: ConnectorRecord): void {
  activeGenerators.delete(buildGeneratorKey(connector));
}

function createPeriodicHeartbeat(
  connector: ConnectorRecord,
  intervalMs = 30_000
): { stop: () => void } {
  let tickCount = 0;
  const intervalId = setInterval(() => {
    tickCount += 1;
    heartbeat({
      stage: "fetching",
      connectorId: connector.id,
      tick: tickCount,
      elapsedSec: tickCount * (intervalMs / 1000),
    });
  }, intervalMs);

  return {
    stop: () => clearInterval(intervalId),
  };
}

async function fetchNextBatch(
  generator: SyncGenerator,
  connector: ConnectorRecord,
  batchSize: number
): Promise<FetchBatchOutput> {
  heartbeat({ stage: "fetching", connectorId: connector.id, tick: 0 });

  const periodicHeartbeat = createPeriodicHeartbeat(connector);

  let value: SyncBatch | undefined;
  let done: boolean | undefined;

  try {
    const result = await generator.next();
    value = result.value;
    done = result.done;
  } catch (error) {
    periodicHeartbeat.stop();
    cleanupGenerator(connector);
    throw error;
  } finally {
    periodicHeartbeat.stop();
  }

  if (done || !value) {
    cleanupGenerator(connector);
    return { items: [], hasMore: false };
  }

  heartbeat({
    stage: "batch_complete",
    itemCount: value.items.length,
    connectorId: connector.id,
  });

  const hasMore = value.hasMore ?? value.items.length >= batchSize;

  if (!hasMore) {
    cleanupGenerator(connector);
  }

  const progressMessage = createProgressMessage({
    connectorType: connector.type,
    itemCount: value.items.length,
    hasMore,
    cursor: value.cursor,
  });

  return {
    items: value.items,
    nextCursor: value.cursor,
    hasMore,
    discoveredResources: value.discoveredResources,
    progressMessage,
  };
}

function createProgressMessage(options: {
  connectorType: string;
  itemCount: number;
  hasMore: boolean;
  cursor?: SyncCursor;
  stats?: { processed: number; skipped: number; errors: number };
}): string {
  const { connectorType, itemCount, hasMore, cursor, stats } = options;

  if (itemCount === 0) {
    return "Sync complete - no more items to fetch";
  }

  const parts: string[] = [`Fetched ${itemCount} items from ${connectorType}`];

  if (stats) {
    const statsParts: string[] = [];
    if (stats.processed > 0) {
      statsParts.push(`${stats.processed} processed`);
    }
    if (stats.skipped > 0) {
      statsParts.push(`${stats.skipped} skipped`);
    }
    if (stats.errors > 0) {
      statsParts.push(`${stats.errors} errors`);
    }

    if (statsParts.length > 0) {
      parts.push(`(${statsParts.join(", ")})`);
    }
  }

  if (hasMore) {
    parts.push("- more batches remaining");
  } else {
    parts.push("- final batch");
  }

  if (cursor?.lastSyncTime) {
    parts.push("[incremental sync]");
  }

  return parts.join(" ");
}

export function createUnifiedFetchBatchActivity(
  _deps: UnifiedSyncDependencies
): ConnectorSyncActivities {
  return {
    async fetchBatch(input: FetchBatchInput): Promise<FetchBatchOutput> {
      const generator = getOrCreateGenerator(input.connector, input.cursor);
      return await fetchNextBatch(generator, input.connector, input.batchSize);
    },
  };
}

export function clearGeneratorCache(connectorId?: string): void {
  if (!connectorId) {
    activeGenerators.clear();
    return;
  }

  for (const key of activeGenerators.keys()) {
    if (key.startsWith(`${connectorId}:`)) {
      activeGenerators.delete(key);
    }
  }
}
