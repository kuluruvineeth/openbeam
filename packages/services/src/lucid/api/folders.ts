import type { LucidClient } from "../client";

export type LucidFolder = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  createdDate: string;
  lastModifiedDate: string;
};

export function listAllFolders(
  client: LucidClient,
  params?: Record<string, string>
): AsyncGenerator<LucidFolder[], void, undefined> {
  return client.listAll<LucidFolder>("/folders", params);
}

export function getFolder(
  client: LucidClient,
  folderId: string
): Promise<LucidFolder> {
  return client.get<LucidFolder>(`/folders/${folderId}`);
}
