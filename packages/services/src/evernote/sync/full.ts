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

interface FullSyncOptions {
  batchSize?: number;
  syncTags?: boolean;
  notebookFilter?: string;
  lookbackDays?: number;
}

export async function* evernoteFullSync(
  client: EvernoteClient,
  context: EvernoteTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<EvernoteSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncTags = options.syncTags ?? true;
  const notebookFilterSet = parseNotebookFilter(options.notebookFilter);

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let maxUsn = 0;

  const notebooks = await listNotebooks(client);
  const notebookMap = new Map(notebooks.map((nb) => [nb.guid, nb]));

  for (const notebook of notebooks) {
    if (
      notebookFilterSet &&
      !notebookFilterSet.has(notebook.name.toLowerCase())
    ) {
      continue;
    }

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

  const allowedNotebookGuids = notebookFilterSet
    ? new Set(
        notebooks
          .filter((nb) => notebookFilterSet.has(nb.name.toLowerCase()))
          .map((nb) => nb.guid)
      )
    : undefined;

  const noteFilter = buildNoteFilter(
    allowedNotebookGuids,
    options.lookbackDays
  );

  for await (const notes of listAllNotes(client, noteFilter, batchSize)) {
    for (const note of notes) {
      try {
        let content: string | undefined;
        try {
          content = await getNoteContent(client, note.guid);
        } catch {
          logger.warn({ noteGuid: note.guid }, "Could not fetch note content");
        }

        documents.push(transformNote(note, context, notebookMap, content));
        processed += 1;

        if ((note.updateSequenceNum ?? 0) > maxUsn) {
          maxUsn = note.updateSequenceNum ?? 0;
        }
      } catch (error) {
        logger.error(
          { error, noteGuid: note.guid },
          "Error transforming Evernote note"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped: 0, errors },
          true,
          maxUsn
        );
        documents = [];
      }
    }
  }

  if (syncTags) {
    try {
      const tags = await listTags(client);
      const tagMap = new Map(tags.map((t) => [t.guid, t]));

      for (const tag of tags) {
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
    } catch (error) {
      logger.error({ error }, "Error listing Evernote tags");
      errors += 1;
    }
  }

  const cursor: EvernoteSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
    lastUpdateCount: maxUsn,
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped: 0, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  maxUsn: number
): EvernoteSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: Date.now(),
      lastFullSync: Date.now(),
      lastUpdateCount: maxUsn,
    },
    hasMore,
    stats,
  };
}

function parseNotebookFilter(filter?: string): Set<string> | undefined {
  if (!filter || filter.trim() === "") {
    return;
  }
  return new Set(
    filter
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean)
  );
}

function buildNoteFilter(
  allowedNotebookGuids?: Set<string>,
  lookbackDays?: number
): Record<string, string | undefined> {
  const filter: Record<string, string | undefined> = {};

  if (allowedNotebookGuids && allowedNotebookGuids.size === 1) {
    const [guid] = allowedNotebookGuids;
    filter.notebookGuid = guid;
  }

  if (lookbackDays && lookbackDays > 0) {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    filter.words = `updated:${formatDateForSearch(since)}`;
  }

  return filter;
}

function formatDateForSearch(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
