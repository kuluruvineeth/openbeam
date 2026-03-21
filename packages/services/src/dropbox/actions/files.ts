import type { DropboxClient } from "../client";

export interface FileActionResult {
  success: boolean;
  id?: string;
  path?: string;
  url?: string;
  error?: string;
}

export async function createDropboxFolder(
  client: DropboxClient,
  path: string
): Promise<FileActionResult> {
  try {
    const result = await client.createFolder(path);
    return {
      success: true,
      id: result.metadata.id,
      path: result.metadata.path_display,
      url: `https://www.dropbox.com/home${result.metadata.path_display}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

export async function moveDropboxEntry(
  client: DropboxClient,
  fromPath: string,
  toPath: string
): Promise<FileActionResult> {
  try {
    const result = await client.moveEntry(fromPath, toPath);
    return {
      success: true,
      id: result.metadata.id,
      path: result.metadata.path_display,
      url: `https://www.dropbox.com/home${result.metadata.path_display}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move entry",
    };
  }
}

export async function deleteDropboxEntry(
  client: DropboxClient,
  path: string
): Promise<FileActionResult> {
  try {
    await client.deleteEntry(path);
    return { success: true, path };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete entry",
    };
  }
}
