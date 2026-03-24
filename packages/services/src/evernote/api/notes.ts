import type { EvernoteClient } from "../client";

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

export type EvernoteNotesMetadataList = {
  startIndex: number;
  totalNotes: number;
  notes: EvernoteNote[];
  updateCount?: number;
};

export function findNotesMetadata(
  client: EvernoteClient,
  filter: EvernoteNoteFilter,
  offset: number,
  maxNotes: number
): Promise<EvernoteNotesMetadataList> {
  return client.post<EvernoteNotesMetadataList>("/notes/search", {
    filter,
    offset,
    maxNotes,
    resultSpec: {
      includeTitle: true,
      includeUpdated: true,
      includeCreated: true,
      includeNotebookGuid: true,
      includeTagGuids: true,
      includeAttributes: true,
      includeUpdateSequenceNum: true,
    },
  });
}

export async function getNoteContent(
  client: EvernoteClient,
  noteGuid: string
): Promise<string> {
  const result = await client.get<{ content: string }>(
    `/notes/${noteGuid}/content`
  );
  return result.content;
}

export function getNote(
  client: EvernoteClient,
  noteGuid: string,
  withContent = false
): Promise<EvernoteNote> {
  const params: Record<string, string> = {};
  if (withContent) {
    params.withContent = "true";
  }
  return client.get<EvernoteNote>(`/notes/${noteGuid}`, params);
}

export async function* listAllNotes(
  client: EvernoteClient,
  filter: EvernoteNoteFilter = {},
  batchSize = 50
): AsyncGenerator<EvernoteNote[], void, undefined> {
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
