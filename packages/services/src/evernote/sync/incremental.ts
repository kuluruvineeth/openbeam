import type {
  EvernoteSyncBatch,
  EvernoteSyncCursor,
  EvernoteTransformContext,
} from "@openbeam/types/services/connectors/evernote";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listNotebooks } from "../api/notebooks";
import { getNoteContent, listAllNotes } from "../api/notes";
import { listTags } from "../api/tags";
import type { EvernoteClient } from "../client";
import { transformNote } from "../transformers/note";
import { transformNotebook } from "../transformers/notebook";
import { transformTag } from "../transformers/tag";
import { evernoteFullSync } from "./full";

interface IncrementalSyncOptions {
  cursor?: EvernoteSyncCursor;
  batchSize?: number;
  syncTags?: boolean;
  notebookFilter?: string;
}

export async function* evernoteIncrementalSync(
  client: EvernoteClient,
  context: EvernoteTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<EvernoteSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50, syncTags = true, notebookFilter } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* evernoteFullSync(client, context, {
      batchSize,
      syncTags,
      notebookFilter,
    });
    return;
  }

  const sinceTime = cursor.lastSyncTime;

  try {
    let documents: GenericDocument[] = [];
    let processed = 0;
    let errors = 0;
    let maxUsn = cursor.lastUpdateCount ?? 0;

    const notebooks = await listNotebooks(client);
    const notebookMap = new Map(notebooks.map((nb) => [nb.guid, nb]));

    for (const notebook of notebooks) {
      if (notebook.serviceUpdated > sinceTime) {
        try {
          documents.push(transformNotebook(notebook, context));
          processed += 1;
          if (notebook.updateSequenceNum > maxUsn) {
            maxUsn = notebook.updateSequenceNum;
          }
        } catch (error) {
          logger.error(
            { error, notebookGuid: notebook.guid },
            "Error transforming Evernote notebook"
          );
          errors += 1;
        }
      }
    }

    const sinceDate = new Date(sinceTime);
    const dateStr = formatDateForSearch(sinceDate);

    for await (const notes of listAllNotes(
      client,
      { words: `updated:${dateStr}` },
      batchSize
    )) {
      for (const note of notes) {
        if (note.updated <= sinceTime) {
          continue;
        }

        try {
          let content: string | undefined;
          try {
            content = await getNoteContent(client, note.guid);
          } catch {
            logger.warn(
              { noteGuid: note.guid },
              "Could not fetch note content"
            );
          }

          documents.push(transformNote(note, context, notebookMap, content));
          processed += 1;

          if (note.updateSequenceNum > maxUsn) {
            maxUsn = note.updateSequenceNum;
          }
        } catch (error) {
          logger.error(
            { error, noteGuid: note.guid },
            "Error transforming Evernote note"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: Date.now(),
              lastFullSync: cursor.lastFullSync,
              lastUpdateCount: maxUsn,
            },
            hasMore: true,
            stats: { processed, skipped: 0, errors },
          };
          documents = [];
        }
      }
    }

    if (syncTags) {
      try {
        const tags = await listTags(client);
        const tagMap = new Map(tags.map((t) => [t.guid, t]));

        for (const tag of tags) {
          if (tag.updateSequenceNum > (cursor.lastUpdateCount ?? 0)) {
            try {
              documents.push(transformTag(tag, context, tagMap));
              processed += 1;
              if (tag.updateSequenceNum > maxUsn) {
                maxUsn = tag.updateSequenceNum;
              }
            } catch (error) {
              logger.error(
                { error, tagGuid: tag.guid },
                "Error transforming Evernote tag"
              );
              errors += 1;
            }
          }
        }
      } catch (error) {
        logger.error({ error }, "Error listing Evernote tags");
        errors += 1;
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: Date.now(),
        lastFullSync: cursor.lastFullSync,
        lastUpdateCount: maxUsn,
      },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Evernote incremental sync failed, falling back to full"
    );
    yield* evernoteFullSync(client, context, {
      batchSize,
      syncTags,
      notebookFilter,
    });
  }
}

function formatDateForSearch(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
