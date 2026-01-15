import {
  type DriveFile,
  GOOGLE_WORKSPACE_MIME_TYPES,
} from "@openplane/types/services/connectors/google-drive";
import type { GoogleDriveClient } from "../client";

export interface FolderActionResult {
  success: boolean;
  folderId?: string;
  error?: string;
}

export interface CreateFolderOptions {
  name: string;
  parents?: string[];
  description?: string;
  colorRgb?: string;
}

export async function createFolder(
  client: GoogleDriveClient,
  options: CreateFolderOptions
): Promise<FolderActionResult> {
  const { name, parents, description, colorRgb } = options;

  const metadata: Record<string, unknown> = {
    name,
    mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
    parents,
    description,
  };

  if (colorRgb) {
    metadata.folderColorRgb = colorRgb;
  }

  const response = await client.post<DriveFile>(
    "/files?supportsAllDrives=true",
    metadata
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function renameFolder(
  client: GoogleDriveClient,
  folderId: string,
  newName: string
): Promise<FolderActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${folderId}?supportsAllDrives=true`,
    { name: newName }
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function moveFolder(
  client: GoogleDriveClient,
  folderId: string,
  options: { addParents: string[]; removeParents: string[] }
): Promise<FolderActionResult> {
  const { addParents, removeParents } = options;

  const params = new URLSearchParams({
    supportsAllDrives: "true",
    addParents: addParents.join(","),
    removeParents: removeParents.join(","),
  });

  const response = await client.patch<DriveFile>(
    `/files/${folderId}?${params.toString()}`,
    {}
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function updateFolderColor(
  client: GoogleDriveClient,
  folderId: string,
  colorRgb: string
): Promise<FolderActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${folderId}?supportsAllDrives=true`,
    { folderColorRgb: colorRgb }
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function trashFolder(
  client: GoogleDriveClient,
  folderId: string
): Promise<FolderActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${folderId}?supportsAllDrives=true`,
    { trashed: true }
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function untrashFolder(
  client: GoogleDriveClient,
  folderId: string
): Promise<FolderActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${folderId}?supportsAllDrives=true`,
    { trashed: false }
  );

  return {
    success: true,
    folderId: response.id,
  };
}

export async function deleteFolder(
  client: GoogleDriveClient,
  folderId: string
): Promise<FolderActionResult> {
  await client.delete(`/files/${folderId}?supportsAllDrives=true`);

  return {
    success: true,
    folderId,
  };
}

export async function copyFolderStructure(
  client: GoogleDriveClient,
  sourceFolderId: string,
  destinationParentId: string,
  newName?: string
): Promise<FolderActionResult> {
  const sourceFolder = await client.get<DriveFile>(
    `/files/${sourceFolderId}?fields=name,description,folderColorRgb&supportsAllDrives=true`
  );

  const newFolder = await createFolder(client, {
    name: newName ?? sourceFolder.name,
    parents: [destinationParentId],
    description: sourceFolder.description,
    colorRgb: sourceFolder.folderColorRgb,
  });

  return newFolder;
}
