import { type EvernoteClient, withRateLimit } from "../client";

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
    reminderOrder?: number;
    reminderDoneTime?: number;
    reminderTime?: number;
    latitude?: number;
    longitude?: number;
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
  return withRateLimit(client, "findNotesMetadata", () =>
    client.noteStore.findNotesMetadata(filter, offset, maxNotes, {
      includeTitle: true,
      includeUpdated: true,
      includeCreated: true,
      includeNotebookGuid: true,
      includeTagGuids: true,
      includeAttributes: true,
      includeUpdateSequenceNum: true,
    })
  );
}

export function getNoteContent(
  client: EvernoteClient,
  noteGuid: string
): Promise<string> {
  return withRateLimit(client, "getNoteContent", () =>
    client.noteStore.getNoteContent(noteGuid)
  );
}

export async function getNote(
  client: EvernoteClient,
  noteGuid: string,
  withContent = false
): Promise<EvernoteNote> {
  const raw = await withRateLimit(client, "getNote", () =>
    client.noteStore.getNote(noteGuid, withContent, false, false, false)
  );
  return {
    guid: raw.guid ?? noteGuid,
    title: raw.title ?? "",
    content: raw.content,
    contentLength: raw.contentLength,
    created: raw.created ?? 0,
    updated: raw.updated ?? 0,
    deleted: raw.deleted,
    active: raw.active ?? true,
    updateSequenceNum: raw.updateSequenceNum ?? 0,
    notebookGuid: raw.notebookGuid ?? "",
    tagGuids: raw.tagGuids,
    tagNames: raw.tagNames,
    attributes: raw.attributes,
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
