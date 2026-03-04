import type {
  AzureIotSyncBatch,
  AzureIotTransformContext,
} from "@openplane/types/services/connectors/azure-iot";
import type { GenericDocument } from "@openplane/vespa";
import type { AzureIotClient } from "../client";
import { transformDevices } from "../transformers/device";
import { createSyncBatch } from "./utils";

interface IncrementalSyncOptions {
  pageSize?: number;
  lastSyncTime?: number;
}

export async function* incrementalSync(
  client: AzureIotClient,
  context: AzureIotTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<AzureIotSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 100, lastSyncTime } = options;
  const clampedPageSize = Math.min(pageSize, 100);

  const query = lastSyncTime
    ? `SELECT * FROM devices WHERE lastActivityTime > '${new Date(lastSyncTime).toISOString()}'`
    : "SELECT * FROM devices";

  let continuationToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.queryTwins({
      query,
      pageSize: clampedPageSize,
      continuationToken,
    });

    const documents = await transformDevices(response.twins, context);
    hasMore = response.continuationToken != null;
    continuationToken = response.continuationToken;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now(), continuationToken },
      "devices",
      hasMore
    );
  }
}
