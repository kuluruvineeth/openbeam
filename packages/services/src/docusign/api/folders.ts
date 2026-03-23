import type { DocuSignClient } from "../client";

export type DocuSignFolder = {
  folderId: string;
  name: string;
  type: string;
  uri?: string;
  parentFolderId?: string;
  parentFolderUri?: string;
  itemCount?: string;
  subFolderCount?: string;
  hasSubFolders?: string;
  ownerUserName?: string;
  ownerEmail?: string;
  ownerUserId?: string;
};

type FolderListResponse = {
  folders?: DocuSignFolder[];
  resultSetSize?: string;
  totalSetSize?: string;
};

export async function listAllFolders(
  client: DocuSignClient
): Promise<DocuSignFolder[]> {
  const response = await client.get<FolderListResponse>("/folders");
  return response.folders ?? [];
}
