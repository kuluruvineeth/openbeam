import type {
  SeismicSyncBatch,
  SeismicSyncCursor,
  SeismicTransformContext,
} from "@openbeam/types/services/connectors/seismic";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllContents } from "../api/contents";
import { listAllLiveDocs } from "../api/livedocs";
import { listAllWorkspaces } from "../api/workspaces";
import type { SeismicClient } from "../client";
import { transformSeismicContent } from "../transformers/content";
import { transformSeismicLiveDoc } from "../transformers/livedoc";
import { transformSeismicWorkspace } from "../transformers/workspace";
import { seismicFullSync } from "./full";

type SyncOptions = {
  cursor?: SeismicSyncCursor;
  batchSize?: number;
  syncLiveDocs?: boolean;
};

export async function* seismicIncrementalSync(
  client: SeismicClient,
  context: SeismicTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<SeismicSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* seismicFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const workspaces of listAllWorkspaces(client, {
      modifiedSince: sinceDate,
    })) {
      for (const workspace of workspaces) {
        try {
          documents.push(transformSeismicWorkspace(workspace, context));
          processed += 1;
          const ts = new Date(workspace.modifiedAt).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, workspaceId: workspace.id },
            "Error transforming Seismic workspace (incremental)"
          );
          errors += 1;
        }
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

    for await (const contents of listAllContents(client, {
      modifiedSince: sinceDate,
    })) {
      for (const content of contents) {
        try {
          documents.push(transformSeismicContent(content, context));
          processed += 1;
          const ts = new Date(content.modifiedAt).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, contentId: content.id },
            "Error transforming Seismic content (incremental)"
          );
          errors += 1;
        }
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

    if (options.syncLiveDocs !== false) {
      for await (const liveDocs of listAllLiveDocs(client, {
        modifiedSince: sinceDate,
      })) {
        for (const liveDoc of liveDocs) {
          try {
            documents.push(transformSeismicLiveDoc(liveDoc, context));
            processed += 1;
            const ts = new Date(liveDoc.modifiedAt).getTime();
            if (ts > latestModified) {
              latestModified = ts;
            }
          } catch (error) {
            logger.error(
              { error, liveDocId: liveDoc.id },
              "Error transforming Seismic LiveDoc (incremental)"
            );
            errors += 1;
          }
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
      "Seismic incremental sync failed, falling back to full"
    );
    yield* seismicFullSync(client, context, options);
  }
}
