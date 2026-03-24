import type { EgnyteClient } from "../client";

export interface FileActionResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export async function createEgnyteFolder(
  client: EgnyteClient,
  path: string
): Promise<FileActionResult> {
  try {
    const result = await client.createFolder(path);
    return {
      success: true,
      path: result.path,
      url: `https://${client.domain}.egnyte.com/navigate/folder/${encodeURIComponent(result.path).replace(/%2F/g, "/")}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

export async function deleteEgnyteItem(
  client: EgnyteClient,
  path: string
): Promise<FileActionResult> {
  try {
    await client.deleteItem(path);
    return { success: true, path };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}
