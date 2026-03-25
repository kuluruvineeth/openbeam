import type { PanoptoClient } from "../client";

export type PanoptoFolder = {
  Id: string;
  Name: string;
  Description: string | null;
  ParentFolder: string | null;
  ParentFolderName: string | null;
  CreatedBy: string | null;
  Sessions: number;
  ChildFolders: number;
  IsPublic: boolean;
  Urls: {
    FolderUrl: string | null;
    EmbedUrl: string | null;
  } | null;
};

export function listAllFolders(
  client: PanoptoClient,
  params?: Record<string, string>
): AsyncGenerator<PanoptoFolder[], void, undefined> {
  return client.listAll<PanoptoFolder>(
    "/folders",
    {
      sortField: "Name",
      sortOrder: "Asc",
      ...params,
    },
    50
  );
}

export function getFolder(
  client: PanoptoClient,
  folderId: string
): Promise<PanoptoFolder> {
  return client.get<PanoptoFolder>(`/folders/${folderId}`);
}
