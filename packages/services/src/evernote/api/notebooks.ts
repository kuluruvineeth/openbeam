import { type EvernoteClient, withRateLimit } from "../client";

export type EvernoteNotebook = {
  guid: string;
  name: string;
  updateSequenceNum: number;
  defaultNotebook?: boolean;
  serviceCreated: number;
  serviceUpdated: number;
  stack?: string;
  sharedNotebookIds?: string[];
  recipientSettings?: {
    reminderNotifyEmail?: boolean;
    reminderNotifyInApp?: boolean;
  };
};

function mapNotebook(raw: {
  guid?: string;
  name?: string;
  updateSequenceNum?: number;
  defaultNotebook?: boolean;
  serviceCreated?: number;
  serviceUpdated?: number;
  stack?: string;
  sharedNotebookIds?: string[];
}): EvernoteNotebook {
  return {
    guid: raw.guid ?? "",
    name: raw.name ?? "",
    updateSequenceNum: raw.updateSequenceNum ?? 0,
    defaultNotebook: raw.defaultNotebook,
    serviceCreated: raw.serviceCreated ?? 0,
    serviceUpdated: raw.serviceUpdated ?? 0,
    stack: raw.stack,
    sharedNotebookIds: raw.sharedNotebookIds,
  };
}

export async function listNotebooks(
  client: EvernoteClient
): Promise<EvernoteNotebook[]> {
  const raw = await withRateLimit(client, "listNotebooks", () =>
    client.noteStore.listNotebooks()
  );
  return raw.map(mapNotebook);
}

export async function getNotebook(
  client: EvernoteClient,
  notebookGuid: string
): Promise<EvernoteNotebook> {
  const raw = await withRateLimit(client, "getNotebook", () =>
    client.noteStore.getNotebook(notebookGuid)
  );
  return mapNotebook(raw);
}
