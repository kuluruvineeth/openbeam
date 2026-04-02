import {
  type EvernoteNotebook as ClientNotebook,
  type EvernoteClient,
  withRateLimit,
} from "../client";

export type EvernoteNotebook = {
  guid: string;
  name: string;
  updateSequenceNum: number;
  defaultNotebook?: boolean;
  serviceCreated: number;
  serviceUpdated: number;
  stack?: string;
  sharedNotebookIds?: string[];
};

function mapNotebook(raw: ClientNotebook): EvernoteNotebook {
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
    client.listNotebooks()
  );
  return raw.map(mapNotebook);
}
