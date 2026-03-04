import type {
  AzureIotSyncBatch,
  AzureIotTransformContext,
} from "@openplane/types/services/connectors/azure-iot";
import type { GenericDocument } from "@openplane/vespa";
import type { AzureIotClient } from "../client";
import { transformDevices } from "../transformers/device";
import { createSyncBatch } from "./utils";

interface FullSyncOptions {
  pageSize?: number;
}

export async function* fullSync(
  client: AzureIotClient,
  context: AzureIotTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<AzureIotSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 100 } = options;
  const clampedPageSize = Math.min(pageSize, 100);

  let continuationToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.queryTwins({
      query: "SELECT * FROM devices",
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
