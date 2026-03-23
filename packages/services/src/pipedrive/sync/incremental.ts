import type {
  PipedriveSyncBatch,
  PipedriveSyncCursor,
  PipedriveTransformContext,
} from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { PipedriveClient } from "../client";
import { transformPipedriveActivity } from "../transformers/activity";
import { transformPipedriveDeal } from "../transformers/deal";
import { transformPipedriveNote } from "../transformers/note";
import { transformPipedriveOrganization } from "../transformers/organization";
import { transformPipedrivePerson } from "../transformers/person";
import { pipedriveFullSync } from "./full";

type RecentItem = {
  item: string;
  id: number;
  data: Record<string, unknown>;
};

type RecentsResponse = {
  success: boolean;
  data: RecentItem[] | null;
  additional_data?: {
    last_timestamp_on_page?: string;
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
  };
};

type SyncOptions = {
  cursor?: PipedriveSyncCursor;
  batchSize?: number;
  syncActivities?: boolean;
  syncNotes?: boolean;
  syncOrganizations?: boolean;
  pipelineFilter?: number[];
};

export async function* pipedriveIncrementalSync(
  client: PipedriveClient,
  context: PipedriveTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<PipedriveSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* pipedriveFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime);
  const sinceTimestamp = sinceDate
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.get<RecentsResponse>("/recents", {
        since_timestamp: sinceTimestamp,
        items: "deal,person,organization,activity,note",
        start: String(start),
        limit: "200",
      });

      const items = response.data ?? [];

      for (const item of items) {
        try {
          const doc = transformRecentItem(item, context, options);
          if (doc) {
            documents.push(doc);
            processed += 1;
            const ts = extractTimestamp(item);
            if (ts > latestModified) {
              latestModified = ts;
            }
          }
        } catch (error) {
          logger.error(
            { error, itemType: item.item, itemId: item.id },
            "Error transforming Pipedrive recent item"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }

      hasMore =
        response.additional_data?.pagination?.more_items_in_collection ?? false;
      start = response.additional_data?.pagination?.next_start ?? start + 200;
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Pipedrive incremental sync failed, falling back to full"
    );
    yield* pipedriveFullSync(client, context, options);
  }
}

function transformRecentItem(
  item: RecentItem,
  context: PipedriveTransformContext,
  options: SyncOptions
): GenericDocument | null {
  const data = item.data;

  switch (item.item) {
    case "deal": {
      const pipelineId = data.pipeline_id as number;
      if (
        options.pipelineFilter &&
        options.pipelineFilter.length > 0 &&
        !options.pipelineFilter.includes(pipelineId)
      ) {
        return null;
      }
      return transformPipedriveDeal(
        data as Parameters<typeof transformPipedriveDeal>[0],
        context
      );
    }
    case "person":
      return transformPipedrivePerson(
        data as Parameters<typeof transformPipedrivePerson>[0],
        context
      );
    case "organization": {
      if (options.syncOrganizations === false) {
        return null;
      }
      return transformPipedriveOrganization(
        data as Parameters<typeof transformPipedriveOrganization>[0],
        context
      );
    }
    case "activity": {
      if (options.syncActivities === false) {
        return null;
      }
      return transformPipedriveActivity(
        data as Parameters<typeof transformPipedriveActivity>[0],
        context
      );
    }
    case "note": {
      if (options.syncNotes === false) {
        return null;
      }
      return transformPipedriveNote(
        data as Parameters<typeof transformPipedriveNote>[0],
        context
      );
    }
    default:
      return null;
  }
}

function extractTimestamp(item: RecentItem): number {
  const updateTime = item.data.update_time as string | undefined;
  if (updateTime) {
    return new Date(updateTime).getTime();
  }
  return Date.now();
}
