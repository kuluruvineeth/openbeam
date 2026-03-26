import type { ShowpadClient } from "../client";

export interface AssetMetadataActionResult {
  success: boolean;
  assetId?: string;
  url?: string;
  error?: string;
}

export async function updateShowpadAssetMetadata(
  client: ShowpadClient,
  assetId: string,
  metadata: Record<string, string>
): Promise<AssetMetadataActionResult> {
  try {
    const result = await client.updateAssetMetadata(assetId, metadata);
    return {
      success: true,
      assetId: result.id,
      url: `https://${client.subdomain}.showpad.biz/#!/asset/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update asset metadata",
    };
  }
}
