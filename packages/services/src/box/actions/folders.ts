import type { BoxClient } from "../client";

export interface BoxFolderEntry {
  id: string;
  name: string;
  type: "file" | "folder" | "web_link";
}

export interface BoxFolderListResult {
  success: boolean;
  data?: BoxFolderEntry[];
  error?: string;
}

export async function listBoxFolderItems(
  client: BoxClient,
  folderId = "0"
): Promise<BoxFolderListResult> {
  try {
    const result = await client.getFolderItems(folderId, 0, 100);

    const entries: BoxFolderEntry[] = result.entries.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
    }));

    return { success: true, data: entries };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list folder items",
    };
  }
}
