import type { GoogleDriveClient } from "../client";
import type { DriveFile } from "../types";

export interface FileActionResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

export interface CreateFileOptions {
  name: string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  content?: string | ArrayBuffer;
}

export interface CopyFileOptions {
  name?: string;
  parents?: string[];
  description?: string;
}

export interface MoveFileOptions {
  addParents: string[];
  removeParents: string[];
}

export interface UpdateFileOptions {
  name?: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
}

export async function createFile(
  client: GoogleDriveClient,
  options: CreateFileOptions
): Promise<FileActionResult> {
  const { name, mimeType, parents, description } = options;

  const metadata: Record<string, unknown> = {
    name,
    mimeType,
    parents,
    description,
  };

  const response = await client.post<DriveFile>(
    "/files?supportsAllDrives=true",
    metadata
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function copyFile(
  client: GoogleDriveClient,
  fileId: string,
  options: CopyFileOptions = {}
): Promise<FileActionResult> {
  const { name, parents, description } = options;

  const metadata: Record<string, unknown> = {
    ...(name && { name }),
    ...(parents && { parents }),
    ...(description && { description }),
  };

  const response = await client.post<DriveFile>(
    `/files/${fileId}/copy?supportsAllDrives=true`,
    metadata
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function moveFile(
  client: GoogleDriveClient,
  fileId: string,
  options: MoveFileOptions
): Promise<FileActionResult> {
  const { addParents, removeParents } = options;

  const params = new URLSearchParams({
    supportsAllDrives: "true",
    addParents: addParents.join(","),
    removeParents: removeParents.join(","),
  });

  const response = await client.patch<DriveFile>(
    `/files/${fileId}?${params.toString()}`,
    {}
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function renameFile(
  client: GoogleDriveClient,
  fileId: string,
  newName: string
): Promise<FileActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    { name: newName }
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function updateFile(
  client: GoogleDriveClient,
  fileId: string,
  options: UpdateFileOptions
): Promise<FileActionResult> {
  const metadata: Record<string, unknown> = {
    ...(options.name !== undefined && { name: options.name }),
    ...(options.description !== undefined && {
      description: options.description,
    }),
    ...(options.starred !== undefined && { starred: options.starred }),
    ...(options.trashed !== undefined && { trashed: options.trashed }),
  };

  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    metadata
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function trashFile(
  client: GoogleDriveClient,
  fileId: string
): Promise<FileActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    { trashed: true }
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function untrashFile(
  client: GoogleDriveClient,
  fileId: string
): Promise<FileActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    { trashed: false }
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function deleteFile(
  client: GoogleDriveClient,
  fileId: string
): Promise<FileActionResult> {
  await client.delete(`/files/${fileId}?supportsAllDrives=true`);

  return {
    success: true,
    fileId,
  };
}

export async function starFile(
  client: GoogleDriveClient,
  fileId: string
): Promise<FileActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    { starred: true }
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function unstarFile(
  client: GoogleDriveClient,
  fileId: string
): Promise<FileActionResult> {
  const response = await client.patch<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    { starred: false }
  );

  return {
    success: true,
    fileId: response.id,
  };
}

export async function batchTrash(
  client: GoogleDriveClient,
  fileIds: string[]
): Promise<{ success: boolean; trashedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let trashedCount = 0;

  for (const fileId of fileIds) {
    try {
      await trashFile(client, fileId);
      trashedCount += 1;
    } catch (error) {
      errors.push(
        `${fileId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    trashedCount,
    errors,
  };
}

export async function batchDelete(
  client: GoogleDriveClient,
  fileIds: string[]
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;

  for (const fileId of fileIds) {
    try {
      await deleteFile(client, fileId);
      deletedCount += 1;
    } catch (error) {
      errors.push(
        `${fileId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors,
  };
}
