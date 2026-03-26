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

export async function* seismicFullSync(
  client: SeismicClient,
  context: SeismicTransformContext,
  options: {
    batchSize?: number;
    syncLiveDocs?: boolean;
  } = {}
): AsyncGenerator<SeismicSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncLiveDocs = options.syncLiveDocs ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const workspaces of listAllWorkspaces(client)) {
    for (const workspace of workspaces) {
      try {
        documents.push(transformSeismicWorkspace(workspace, context));
        processed += 1;
        latestModified = trackModified(workspace.modifiedAt, latestModified);
      } catch (error) {
        logger.error(
          { error, workspaceId: workspace.id },
          "Error transforming Seismic workspace"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  for await (const contents of listAllContents(client)) {
    for (const content of contents) {
      try {
        documents.push(transformSeismicContent(content, context));
        processed += 1;
        latestModified = trackModified(content.modifiedAt, latestModified);
      } catch (error) {
        logger.error(
          { error, contentId: content.id },
          "Error transforming Seismic content"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  if (syncLiveDocs) {
    for await (const liveDocs of listAllLiveDocs(client)) {
      for (const liveDoc of liveDocs) {
        try {
          documents.push(transformSeismicLiveDoc(liveDoc, context));
          processed += 1;
          latestModified = trackModified(liveDoc.modifiedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, liveDocId: liveDoc.id },
            "Error transforming Seismic LiveDoc"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: SeismicSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): SeismicSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(modifiedAt: string, current: number): number {
  const ts = new Date(modifiedAt).getTime();
  return ts > current ? ts : current;
}
