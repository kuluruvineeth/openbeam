import type { SeismicClient } from "../client";

export interface ContentActionResult {
  success: boolean;
  contentId?: string;
  url?: string;
  error?: string;
}

export async function updateSeismicContentMetadata(
  client: SeismicClient,
  contentId: string,
  metadata: Record<string, unknown>
): Promise<ContentActionResult> {
  try {
    const result = await client.patch<{
      id: string;
      url?: string;
    }>(`/contents/${contentId}`, metadata);
    return {
      success: true,
      contentId: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update content metadata",
    };
  }
}
