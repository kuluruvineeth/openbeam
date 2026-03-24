import type { CanvaClient } from "../client";

export type CanvaFolder = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
};

export type CanvaFolderItem = {
  type: "design" | "folder" | "image";
  design?: { id: string; title: string };
  folder?: { id: string; name: string };
};

export function listAllFolders(
  client: CanvaClient,
  params?: Record<string, string>
): AsyncGenerator<CanvaFolder[], void, undefined> {
  return client.listAll<CanvaFolder>("/folders", params);
}

export function listFolderItems(
  client: CanvaClient,
  folderId: string,
  params?: Record<string, string>
): AsyncGenerator<CanvaFolderItem[], void, undefined> {
  return client.listAll<CanvaFolderItem>(`/folders/${folderId}/items`, params);
}
