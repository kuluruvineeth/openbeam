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
import { panoptoFullSync } from "./full";

type SyncOptions = {
  cursor?: PanoptoSyncCursor;
  batchSize?: number;
  syncPlaylists?: boolean;
};

export async function* panoptoIncrementalSync(
  client: PanoptoClient,
  context: PanoptoTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<PanoptoSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* panoptoFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime);

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestCreated = cursor.lastSyncTime;

  try {
    for await (const sessions of listAllSessions(client)) {
      for (const session of sessions) {
        const createdTs = new Date(session.CreatedDate).getTime();
        if (createdTs <= sinceDate.getTime()) {
          continue;
        }
        try {
          documents.push(transformPanoptoSession(session, context));
          processed += 1;
          if (createdTs > latestCreated) {
            latestCreated = createdTs;
          }
        } catch (error) {
          logger.error(
            { error, sessionId: session.Id },
            "Error transforming Panopto session in incremental sync"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestCreated,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
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
            "Error transforming Panopto folder in incremental sync"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestCreated,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    if (options.syncPlaylists !== false) {
      for await (const playlists of listAllPlaylists(client)) {
        for (const playlist of playlists) {
          try {
            documents.push(transformPanoptoPlaylist(playlist, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, playlistId: playlist.Id },
              "Error transforming Panopto playlist in incremental sync"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestCreated,
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
        lastSyncTime: latestCreated,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Panopto incremental sync failed, falling back to full"
    );
    yield* panoptoFullSync(client, context, options);
  }
}
