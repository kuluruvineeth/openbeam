import type {
  SharePointSyncBatch,
  SharePointSyncCursor,
  SharePointTransformContext,
} from "@openbeam/types/services/connectors/sharepoint";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { MicrosoftGraphApiError } from "../../microsoft/types";
import { transformDriveItem } from "../transformers/drive-item";
import { type SharePointFileInfo, sharepointFullSync } from "./full";

type SharePointDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: { user?: { displayName?: string; email?: string } };
  lastModifiedBy?: { user?: { displayName?: string; email?: string } };
  parentReference?: {
    id?: string;
    path?: string;
    driveId?: string;
    siteId?: string;
  };
  "@removed"?: { reason: string };
};

export async function* sharepointIncrementalSync(
  client: MicrosoftGraphClient,
  context: SharePointTransformContext,
  options: {
    cursor?: SharePointSyncCursor;
    batchSize?: number;
    onFilesDiscovered?: (files: SharePointFileInfo[]) => Promise<void>;
  } = {}
): AsyncGenerator<SharePointSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100, onFilesDiscovered } = options;

  if (
    !(cursor?.deltaLinks && cursor.lastFullSync) ||
    Object.keys(cursor.deltaLinks).length === 0
  ) {
    yield* sharepointFullSync(client, context, {
      batchSize,
      onFilesDiscovered,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const newDeltaLinks: Record<string, string> = { ...cursor.deltaLinks };

  for (const [key, deltaLink] of Object.entries(cursor.deltaLinks)) {
    const [_siteId, driveId] = key.split(":");

    try {
      for await (const page of client.deltaPages<SharePointDriveItem>(
        `/drives/${driveId}/root/delta`,
        deltaLink
      )) {
        if (page.deltaLink) {
          newDeltaLinks[key] = page.deltaLink;
        }

        for (const item of page.items) {
          if (item["@removed"]) {
            skipped += 1;
            continue;
          }
          if (item.folder) {
            skipped += 1;
            continue;
          }

          try {
            const doc = transformDriveItem(item, context, {});
            documents.push(doc);
            processed += 1;

            if (item.file && onFilesDiscovered) {
              await onFilesDiscovered([
                {
                  itemId: item.id,
                  driveId: item.parentReference?.driveId ?? "",
                  name: item.name,
                  mimeType: item.file.mimeType,
                  size: item.size ?? 0,
                },
              ]);
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  deltaLinks: { ...newDeltaLinks },
                  siteIds: cursor.siteIds,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, itemId: item.id },
              "Failed to transform drive item"
            );
            errors += 1;
          }
        }
      }
    } catch (error) {
      const isDeltaExpired =
        error instanceof MicrosoftGraphApiError &&
        (error.code === "syncStateNotFound" || error.statusCode === 410);
      if (!isDeltaExpired) {
        throw error;
      }
      logger.warn(
        { error, key },
        "Delta token expired for drive, triggering full re-sync"
      );
      yield* sharepointFullSync(client, context, {
        batchSize,
        onFilesDiscovered,
      });
      return;
    }
  }

  yield {
    items: documents,
    cursor: {
      deltaLinks: newDeltaLinks,
      siteIds: cursor.siteIds,
      lastFullSync: cursor.lastFullSync,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
