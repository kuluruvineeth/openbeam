import type {
  VerkadaSyncBatch,
  VerkadaTransformContext,
} from "@openbeam/types/services/connectors/verkada";
import type { GenericDocument } from "@openbeam/vespa";
import type { VerkadaClient } from "../client";
import type { VerkadaCamera } from "../transformers/camera";
import { transformCameras } from "../transformers/camera";
import { createSyncBatch } from "./utils";

interface VerkadaCameraResponse {
  cameras: VerkadaCamera[];
  next_page_token: string | null;
}

interface IncrementalSyncOptions {
  pageSize?: number;
}

export async function* incrementalSync(
  client: VerkadaClient,
  context: VerkadaTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<VerkadaSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 100 } = options;
  const pageSizeStr = String(Math.min(pageSize, 200));

  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = { page_size: pageSizeStr };
    if (pageToken) {
      params.page_token = pageToken;
    }

    const response = await client.get<VerkadaCameraResponse>(
      "/cameras/v1/devices",
      params
    );

    const documents = await transformCameras(response.cameras, context);
    hasMore = response.next_page_token != null;
    pageToken = response.next_page_token ?? undefined;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "cameras",
      hasMore
    );
  }
}
