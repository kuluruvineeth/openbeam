import type { BynderClient } from "../client";

export interface CollectionActionResult {
  success: boolean;
  collectionId?: string;
  url?: string;
  error?: string;
}

export async function createBynderCollection(
  client: BynderClient,
  name: string,
  description?: string
): Promise<CollectionActionResult> {
  try {
    const result = await client.createCollection(name, description);
    return {
      success: true,
      collectionId: result.id,
      url: `https://${client.domain}.bynder.com/collections/${result.id}/`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create collection",
    };
  }
}

export async function addAssetToBynderCollection(
  client: BynderClient,
  collectionId: string,
  assetId: string
): Promise<CollectionActionResult> {
  try {
    await client.addAssetToCollection(collectionId, assetId);
    return {
      success: true,
      collectionId,
      url: `https://${client.domain}.bynder.com/collections/${collectionId}/`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add asset to collection",
    };
  }
}
