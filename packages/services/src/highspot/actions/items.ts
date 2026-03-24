import type { HighspotClient } from "../client";

export interface ItemActionResult {
  success: boolean;
  itemId?: string;
  url?: string;
  error?: string;
}

export async function updateHighspotItemMetadata(
  client: HighspotClient,
  itemId: string,
  metadata: Record<string, unknown>
): Promise<ItemActionResult> {
  try {
    const result = await client.put<{
      data: { id: string; url: string };
    }>(`/items/${itemId}`, metadata);
    return {
      success: true,
      itemId: result.data.id,
      url: result.data.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update item metadata",
    };
  }
}
