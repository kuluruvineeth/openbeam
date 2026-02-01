import type { TwelveLabsClient } from "@openplane/media";

export interface GenerateThumbnailsDependencies {
  twelvelabs: TwelveLabsClient;
  indexId: string;
}

export function createGenerateThumbnailsActivity(
  deps: GenerateThumbnailsDependencies
) {
  const { twelvelabs, indexId } = deps;

  return async function generateThumbnails(input: {
    path: string;
    timestamps: number[];
  }): Promise<string[]> {
    const videoId = await twelvelabs.indexVideo(indexId, input.path);
    const asset = await twelvelabs.retrieveIndexedAsset(indexId, videoId);
    const thumbnails = asset.hls?.thumbnailUrls ?? [];
    return thumbnails.slice(0, input.timestamps.length);
  };
}
