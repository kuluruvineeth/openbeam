import { type ImageSearchResult, TwelveLabsClient } from "@openplane/media";
import type {
  ImageSearchOptions,
  MediaAnalysisOptions,
  MediaAnalysisResult,
  MediaGist,
  MediaSummaryOptions,
  ServiceMediaChapter,
  ServiceMediaHighlight,
  TranscriptSegment,
} from "./types";

export class MediaAIService {
  private client: TwelveLabsClient | null = null;

  private getClient(): TwelveLabsClient {
    if (!this.client) {
      this.client = new TwelveLabsClient();
    }
    return this.client;
  }

  async analyzeMedia(
    mediaId: string,
    question: string,
    options: MediaAnalysisOptions = {}
  ): Promise<MediaAnalysisResult> {
    const client = this.getClient();
    const answer = await client.analyzeVideo(mediaId, question, options);
    return { answer, mediaId };
  }

  generateSummary(
    mediaId: string,
    options: MediaSummaryOptions = {}
  ): Promise<string> {
    const client = this.getClient();
    return client.generateSummary(mediaId, options);
  }

  async generateChapters(
    mediaId: string,
    options: { prompt?: string } = {}
  ): Promise<ServiceMediaChapter[]> {
    const client = this.getClient();
    const chapters = await client.generateChapters(mediaId, options);
    return chapters.map((ch) => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      summary: ch.summary,
      startSec: ch.startSec,
      endSec: ch.endSec,
    }));
  }

  async generateHighlights(
    mediaId: string,
    options: { prompt?: string } = {}
  ): Promise<ServiceMediaHighlight[]> {
    const client = this.getClient();
    const highlights = await client.generateHighlights(mediaId, options);
    return highlights.map((h) => ({
      highlight: h.highlight,
      summary: h.summary,
      startSec: h.startSec,
      endSec: h.endSec,
    }));
  }

  generateGist(
    mediaId: string,
    types: Array<"title" | "topic" | "hashtag"> = ["title", "topic", "hashtag"]
  ): Promise<MediaGist> {
    const client = this.getClient();
    return client.generateGist(mediaId, types);
  }

  getTranscript(indexId: string, mediaId: string): Promise<string> {
    const client = this.getClient();
    return client.getVideoTranscript(indexId, mediaId);
  }

  getTranscriptWithTimestamps(
    indexId: string,
    mediaId: string
  ): Promise<TranscriptSegment[]> {
    const client = this.getClient();
    return client.getVideoTranscriptWithTimestamps(indexId, mediaId);
  }

  searchByImage(
    indexId: string,
    imageUrl: string,
    options: ImageSearchOptions = {}
  ): Promise<ImageSearchResult[]> {
    const client = this.getClient();
    return client.searchByImage(indexId, imageUrl, options);
  }

  searchByText(
    indexId: string,
    query: string,
    options: ImageSearchOptions = {}
  ): Promise<ImageSearchResult[]> {
    const client = this.getClient();
    return client.searchByText(indexId, query, options);
  }
}

export const mediaAIService = new MediaAIService();
