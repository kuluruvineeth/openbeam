import type { EvernoteClient } from "../client";

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

export function listNotebooks(
  client: EvernoteClient
): Promise<EvernoteNotebook[]> {
  return client.get<EvernoteNotebook[]>("/notebooks");
}

export function getNotebook(
  client: EvernoteClient,
  notebookGuid: string
): Promise<EvernoteNotebook> {
  return client.get<EvernoteNotebook>(`/notebooks/${notebookGuid}`);
}
