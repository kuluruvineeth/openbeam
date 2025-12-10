import { TwelveLabsClient } from "../client";
import type { ProcessedVideo, VideoMetadata, VideoSegment } from "../types";

function generateVideoId(videoUrl: string): string {
  let hash = 0;
  for (const char of videoUrl) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
  }
  return `vid_${Math.abs(hash).toString(36)}`;
}

function getLastSegmentEndTime(segments: VideoSegment[]): number {
  return segments.at(-1)?.endTime ?? 0;
}

export class VideoEmbeddingService {
  private readonly client: TwelveLabsClient;

  constructor(options: { modelName?: "marengo3.0" | "marengo2.7" } = {}) {
    this.client = new TwelveLabsClient(options);
  }

  async processVideo(
    videoUrl: string,
    indexId?: string
  ): Promise<ProcessedVideo> {
    const videoId = generateVideoId(videoUrl);
    const { segments } = await this.client.generateEmbeddings(videoUrl);

    let metadata: VideoMetadata;
    if (indexId) {
      const twelveLabsVideoId = await this.client.indexVideo(indexId, videoUrl);
      metadata = await this.client.generateMetadata(indexId, twelveLabsVideoId);
      metadata.transcript = await this.client.getVideoTranscript(
        indexId,
        twelveLabsVideoId
      );
    } else {
      metadata = {
        summary: "",
        keywords: [],
        duration: getLastSegmentEndTime(segments),
      };
    }

    return { videoId, metadata, segments };
  }

  async processVideoWithEmbeddings(
    videoUrl: string
  ): Promise<{ segments: VideoSegment[]; duration: number }> {
    const { segments } = await this.client.generateEmbeddings(videoUrl);
    return { segments, duration: getLastSegmentEndTime(segments) };
  }

  embedTextQuery(query: string): Promise<number[]> {
    return this.client.embedText(query);
  }
}

export const videoEmbeddingService = new VideoEmbeddingService();
