import {
  type EvernoteNote as ClientNote,
  type EvernoteClient,
  withRateLimit,
} from "../client";

export type EvernoteNote = {
  guid: string;
  title: string;
  content?: string;
  contentHash?: string;
  contentLength?: number;
  created: number;
  updated: number;
  deleted?: number;
  active: boolean;
  updateSequenceNum: number;
  notebookGuid: string;
  tagGuids?: string[];
  tagNames?: string[];
  attributes?: {
    author?: string;
    source?: string;
    sourceURL?: string;
    sourceApplication?: string;
    contentClass?: string;
  };
};

export type EvernoteNoteFilter = {
  notebookGuid?: string;
  words?: string;
  tagGuids?: string[];
  ascending?: boolean;
  order?: number;
};

export type EvernoteNoteMetadata = {
  guid: string;
  title?: string;
  contentLength?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  updateSequenceNum?: number;
  notebookGuid?: string;
  tagGuids?: string[];
  tagNames?: string[];
  attributes?: EvernoteNote["attributes"];
};

export type EvernoteNotesMetadataList = {
  startIndex: number;
  totalNotes: number;
  notes: EvernoteNoteMetadata[];
  updateCount?: number;
};

export function findNotesMetadata(
  client: EvernoteClient,
  filter: EvernoteNoteFilter,
  offset: number,
  maxNotes: number
): Promise<EvernoteNotesMetadataList> {
  return withRateLimit(client, "findNotesMetadata", async () => {
    const result = await client.findNotesMetadata(filter, offset, maxNotes);
    return {
      startIndex: offset,
      totalNotes: result.totalNotes,
      notes: (result.notes ?? []) as EvernoteNoteMetadata[],
      updateCount: result.updateCount,
    };
  });
}

export async function getNoteContent(
  client: EvernoteClient,
  noteGuid: string
): Promise<string> {
  const note = await withRateLimit(client, "getNoteContent", () =>
    client.getNote(noteGuid)
  );
  return note.content ?? "";
}

export async function getNote(
  client: EvernoteClient,
  noteGuid: string,
  withContent = false
): Promise<EvernoteNote> {
  const raw: ClientNote = await withRateLimit(client, "getNote", () =>
    client.getNote(noteGuid)
  );
  return {
    guid: raw.guid ?? noteGuid,
    title: raw.title ?? "",
    content: withContent ? raw.content : undefined,
    contentLength: raw.contentLength,
    created: raw.created ?? 0,
    updated: raw.updated ?? 0,
    active: raw.active ?? true,
    updateSequenceNum: raw.updateSequenceNum ?? 0,
    notebookGuid: raw.notebookGuid ?? "",
    tagGuids: raw.tagGuids,
    attributes: raw.attributes as EvernoteNote["attributes"],
  };
}

export async function* listAllNotes(
  client: EvernoteClient,
  filter: EvernoteNoteFilter = {},
  batchSize = 50
): AsyncGenerator<EvernoteNoteMetadata[], void, undefined> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await findNotesMetadata(client, filter, offset, batchSize);
    const notes = result.notes ?? [];
    if (notes.length > 0) {
      yield notes;
    }
    offset += notes.length;
    hasMore = offset < result.totalNotes && notes.length >= batchSize;
  }
}
