import type { BoxClient } from "../client";

export interface FileActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export async function createBoxFolder(
  client: BoxClient,
  name: string,
  parentId: string
): Promise<FileActionResult> {
  try {
    const result = await client.createFolder(name, parentId);
    return {
      success: true,
      id: result.id,
      url: `https://app.box.com/folder/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

export async function moveBoxItem(
  client: BoxClient,
  itemType: "file" | "folder",
  itemId: string,
  newParentId: string
): Promise<FileActionResult> {
  try {
    const result = await client.moveItem(itemType, itemId, newParentId);
    const urlPrefix = itemType === "folder" ? "folder" : "file";
    return {
      success: true,
      id: result.id,
      url: `https://app.box.com/${urlPrefix}/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move item",
    };
  }
}

export async function deleteBoxItem(
  client: BoxClient,
  itemType: "file" | "folder",
  itemId: string
): Promise<FileActionResult> {
  try {
    await client.deleteItem(itemType, itemId);
    return { success: true, id: itemId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

export async function shareBoxItem(
  client: BoxClient,
  itemType: "file" | "folder",
  itemId: string,
  access = "open"
): Promise<FileActionResult> {
  try {
    const result = await client.createSharedLink(itemType, itemId, access);
    return {
      success: true,
      id: result.id,
      url: result.shared_link?.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to share item",
    };
  }
}
