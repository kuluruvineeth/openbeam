import type {
  PanoptoSyncBatch,
  PanoptoSyncCursor,
  PanoptoTransformContext,
} from "@openbeam/types/services/connectors/panopto";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllFolders } from "../api/folders";
import { listAllPlaylists } from "../api/playlists";
import { listAllSessions } from "../api/sessions";
import type { PanoptoClient } from "../client";
import { transformPanoptoFolder } from "../transformers/folder";
import { transformPanoptoPlaylist } from "../transformers/playlist";
import { transformPanoptoSession } from "../transformers/session";

export async function* panoptoFullSync(
  client: PanoptoClient,
  context: PanoptoTransformContext,
  options: {
    batchSize?: number;
    syncPlaylists?: boolean;
  } = {}
): AsyncGenerator<PanoptoSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncPlaylists = options.syncPlaylists ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestCreated = 0;

  for await (const sessions of listAllSessions(client)) {
    for (const session of sessions) {
      try {
        documents.push(transformPanoptoSession(session, context));
        processed += 1;
        const ts = new Date(session.CreatedDate).getTime();
        if (ts > latestCreated) {
          latestCreated = ts;
        }
      } catch (error) {
        logger.error(
          { error, sessionId: session.Id },
          "Error transforming Panopto session"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestCreated
      );
      documents = [];
    }
  }

  for await (const folders of listAllFolders(client)) {
    for (const folder of folders) {
      try {
        documents.push(transformPanoptoFolder(folder, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, folderId: folder.Id },
          "Error transforming Panopto folder"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestCreated
      );
      documents = [];
    }
  }

  if (syncPlaylists) {
    for await (const playlists of listAllPlaylists(client)) {
      for (const playlist of playlists) {
        try {
          documents.push(transformPanoptoPlaylist(playlist, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, playlistId: playlist.Id },
            "Error transforming Panopto playlist"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestCreated
        );
        documents = [];
      }
    }
  }

  const cursor: PanoptoSyncCursor = {
    lastSyncTime: latestCreated || Date.now(),
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
  latestCreated: number
): PanoptoSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestCreated || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}
