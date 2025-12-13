import { TwelveLabsClient } from "../client";
import type {
  MediaInputType,
  MediaMetadata,
  MediaSegment,
  ProcessedMedia,
} from "../types";

function generateMediaId(mediaUrl: string): string {
  let hash = 0;
  for (const char of mediaUrl) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
  }
  return `media_${Math.abs(hash).toString(36)}`;
}

function getLastSegmentEndTime(segments: MediaSegment[]): number {
  return segments.at(-1)?.endTime ?? 0;
}

export class MediaEmbeddingService {
  private readonly client: TwelveLabsClient;

  constructor(options: { modelName?: "marengo3.0" | "marengo2.7" } = {}) {
    this.client = new TwelveLabsClient(options);
  }

  async processMedia(
    mediaUrl: string,
    options: { indexId?: string; inputType?: MediaInputType } = {}
  ): Promise<ProcessedMedia> {
    const mediaId = generateMediaId(mediaUrl);
    const inputType = options.inputType ?? "video";
    const { segments } = await this.client.generateEmbeddings(mediaUrl, {
      inputType,
    });

    let metadata: MediaMetadata;
    if (options.indexId) {
      const twelveLabsAssetId = await this.client.indexVideo(
        options.indexId,
        mediaUrl
      );
      metadata = await this.client.generateMetadata(
        options.indexId,
        twelveLabsAssetId
      );
      metadata.transcript = await this.client.getVideoTranscript(
        options.indexId,
        twelveLabsAssetId
      );
    } else {
      metadata = {
        summary: "",
        keywords: [],
        duration: getLastSegmentEndTime(segments),
      };
    }

    return { mediaId, metadata, segments };
  }

  async processMediaWithEmbeddings(
    mediaUrl: string,
    inputType: MediaInputType = "video"
  ): Promise<{ segments: MediaSegment[]; duration: number }> {
    const { segments } = await this.client.generateEmbeddings(mediaUrl, {
      inputType,
    });
    return { segments, duration: getLastSegmentEndTime(segments) };
  }

  embedTextQuery(query: string): Promise<number[]> {
    return this.client.embedText(query);
  }
}

export const mediaEmbeddingService = new MediaEmbeddingService();
