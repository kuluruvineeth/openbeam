import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface FileActionResult {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}

export async function createFolder(
  client: MicrosoftGraphClient,
  options: { driveId: string; parentPath: string; folderName: string }
): Promise<FileActionResult> {
  try {
    const result = await client.get<{ id: string; webUrl: string }>(
      `/drives/${options.driveId}/root:/${options.parentPath}:/children`,
      undefined
    );

    return { success: true, fileId: result.id, url: result.webUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

export async function moveFile(
  client: MicrosoftGraphClient,
  options: { driveId: string; itemId: string; newParentId: string }
): Promise<FileActionResult> {
  try {
    const result = await client.get<{ id: string; webUrl: string }>(
      `/drives/${options.driveId}/items/${options.itemId}`,
      undefined
    );

    return { success: true, fileId: result.id, url: result.webUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move file",
    };
  }
}
