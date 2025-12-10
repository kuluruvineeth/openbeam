import { TwelveLabsClient } from "@openplane/video";
import type {
  ImageSearchOptions,
  ImageSearchResult,
  TranscriptSegment,
  VideoAnalysisOptions,
  VideoAnalysisResult,
  VideoChapter,
  VideoGist,
  VideoHighlight,
  VideoSummaryOptions,
} from "./types";

export class VideoAIService {
  private client: TwelveLabsClient | null = null;

  private getClient(): TwelveLabsClient {
    if (!this.client) {
      this.client = new TwelveLabsClient();
    }
    return this.client;
  }

  async analyzeVideo(
    videoId: string,
    question: string,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoAnalysisResult> {
    const client = this.getClient();
    const answer = await client.analyzeVideo(videoId, question, options);
    return { answer, videoId };
  }

  generateSummary(
    videoId: string,
    options: VideoSummaryOptions = {}
  ): Promise<string> {
    const client = this.getClient();
    return client.generateSummary(videoId, options);
  }

  async generateChapters(
    videoId: string,
    options: { prompt?: string } = {}
  ): Promise<VideoChapter[]> {
    const client = this.getClient();
    const chapters = await client.generateChapters(videoId, options);
    return chapters.map((ch) => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      summary: ch.summary,
      startSec: ch.startSec,
      endSec: ch.endSec,
    }));
  }

  async generateHighlights(
    videoId: string,
    options: { prompt?: string } = {}
  ): Promise<VideoHighlight[]> {
    const client = this.getClient();
    const highlights = await client.generateHighlights(videoId, options);
    return highlights.map((h) => ({
      highlight: h.highlight,
      summary: h.summary,
      startSec: h.startSec,
      endSec: h.endSec,
    }));
  }

  generateGist(
    videoId: string,
    types: Array<"title" | "topic" | "hashtag"> = ["title", "topic", "hashtag"]
  ): Promise<VideoGist> {
    const client = this.getClient();
    return client.generateGist(videoId, types);
  }

  getTranscript(indexId: string, videoId: string): Promise<string> {
    const client = this.getClient();
    return client.getVideoTranscript(indexId, videoId);
  }

  getTranscriptWithTimestamps(
    indexId: string,
    videoId: string
  ): Promise<TranscriptSegment[]> {
    const client = this.getClient();
    return client.getVideoTranscriptWithTimestamps(indexId, videoId);
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

export const videoAIService = new VideoAIService();
