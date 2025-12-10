import prisma from "@openplane/db";
import type { VideoDocument } from "@openplane/vespa";
import { vespaClient } from "@openplane/vespa";
import { TwelveLabsClient } from "@openplane/video";
import type { TranscriptSegment, VideoChapter, VideoHighlight } from "./types";

interface VideoMetadataJson {
  twelveLabsIndexId?: string;
  twelveLabsVideoId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

type VespaVideoDoc = Pick<
  VideoDocument,
  "video_summary" | "chapters" | "highlights" | "transcript_segments"
> & {
  metadata?: VideoMetadataJson | string;
};

export type ContentType = "chapters" | "highlights" | "summary" | "transcript";

export interface VideoMetadata {
  vespaId: string;
  summary: string;
  chapters: VideoChapter[];
  highlights: VideoHighlight[];
  transcriptSegments: TranscriptSegment[];
}

export interface CachedVideoContent {
  summary: string | null;
  chapters: VideoChapter[];
  highlights: VideoHighlight[];
  transcriptSegments: TranscriptSegment[];
}

interface TwelveLabsIds {
  indexId: string;
  videoId: string;
}

export class VideoMetadataService {
  private client: TwelveLabsClient | null = null;

  private getClient(): TwelveLabsClient {
    if (!this.client) {
      this.client = new TwelveLabsClient();
    }
    return this.client;
  }

  async getVideoMetadata(vespaId: string): Promise<CachedVideoContent | null> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    if (!doc) {
      return null;
    }
    return this.extractCachedContent(doc);
  }

  async getChapters(
    vespaId: string,
    forceRefresh = false
  ): Promise<VideoChapter[]> {
    if (!forceRefresh) {
      const cached = await this.getCachedChapters(vespaId);
      if (cached.length > 0) {
        return cached;
      }
    }

    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      return [];
    }

    const chapters = await this.fetchChaptersFromApi(ids.videoId);
    await this.updateVespaChapters(vespaId, chapters);
    return chapters;
  }

  async getHighlights(
    vespaId: string,
    forceRefresh = false
  ): Promise<VideoHighlight[]> {
    if (!forceRefresh) {
      const cached = await this.getCachedHighlights(vespaId);
      if (cached.length > 0) {
        return cached;
      }
    }

    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      return [];
    }

    const highlights = await this.fetchHighlightsFromApi(ids.videoId);
    await this.updateVespaHighlights(vespaId, highlights);
    return highlights;
  }

  async getSummary(vespaId: string, forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const cached = await this.getCachedSummary(vespaId);
      if (cached) {
        return cached;
      }
    }

    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      return "";
    }

    const summary = await this.fetchSummaryFromApi(ids.videoId);
    await this.updateVespaSummary(vespaId, summary);
    return summary;
  }

  async getTranscriptSegments(
    vespaId: string,
    forceRefresh = false
  ): Promise<TranscriptSegment[]> {
    if (!forceRefresh) {
      const cached = await this.getCachedTranscriptSegments(vespaId);
      if (cached.length > 0) {
        return cached;
      }
    }

    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      return [];
    }

    const segments = await this.fetchTranscriptFromApi(
      ids.indexId,
      ids.videoId
    );
    await this.updateVespaTranscriptSegments(vespaId, segments);
    return segments;
  }

  async regenerateContent(
    vespaId: string,
    contentTypes: ContentType[]
  ): Promise<CachedVideoContent> {
    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      throw new Error(`TwelveLabs IDs not found for video: ${vespaId}`);
    }

    const results: CachedVideoContent = {
      summary: null,
      chapters: [],
      highlights: [],
      transcriptSegments: [],
    };

    const tasks = contentTypes.map(async (type: ContentType) => {
      switch (type) {
        case "chapters": {
          results.chapters = await this.fetchChaptersFromApi(ids.videoId);
          await this.updateVespaChapters(vespaId, results.chapters);
          break;
        }
        case "highlights": {
          results.highlights = await this.fetchHighlightsFromApi(ids.videoId);
          await this.updateVespaHighlights(vespaId, results.highlights);
          break;
        }
        case "summary": {
          results.summary = await this.fetchSummaryFromApi(ids.videoId);
          await this.updateVespaSummary(vespaId, results.summary);
          break;
        }
        case "transcript": {
          results.transcriptSegments = await this.fetchTranscriptFromApi(
            ids.indexId,
            ids.videoId
          );
          await this.updateVespaTranscriptSegments(
            vespaId,
            results.transcriptSegments
          );
          break;
        }
        default: {
          const exhaustiveCheck: never = type;
          throw new Error(`Unknown content type: ${exhaustiveCheck}`);
        }
      }
    });

    await Promise.all(tasks);
    return results;
  }

  private async getCachedChapters(vespaId: string): Promise<VideoChapter[]> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    if (!doc?.chapters?.length) {
      return [];
    }
    return this.parseChapters(doc.chapters);
  }

  private async getCachedHighlights(
    vespaId: string
  ): Promise<VideoHighlight[]> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    if (!doc?.highlights?.length) {
      return [];
    }
    return this.parseHighlights(doc.highlights);
  }

  private async getCachedSummary(vespaId: string): Promise<string | null> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    return doc?.video_summary ?? null;
  }

  private async getCachedTranscriptSegments(
    vespaId: string
  ): Promise<TranscriptSegment[]> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    if (!doc?.transcript_segments?.length) {
      return [];
    }
    return this.parseTranscriptSegments(doc.transcript_segments);
  }

  private async getTwelveLabsIds(
    vespaId: string
  ): Promise<TwelveLabsIds | null> {
    const doc = (await vespaClient.getVideoDocument(
      vespaId
    )) as VespaVideoDoc | null;
    if (!doc?.metadata) {
      return null;
    }

    const metadata: VideoMetadataJson =
      typeof doc.metadata === "string"
        ? (JSON.parse(doc.metadata) as VideoMetadataJson)
        : doc.metadata;

    const indexId = metadata.twelveLabsIndexId;
    const videoId = metadata.twelveLabsVideoId;

    if (!(indexId && videoId)) {
      const dbVideo = await prisma.indexedVideo.findFirst({
        where: { vespaId },
        select: { twelveLabsIndexId: true, twelveLabsVideoId: true },
      });

      if (!(dbVideo?.twelveLabsIndexId && dbVideo?.twelveLabsVideoId)) {
        return null;
      }

      return {
        indexId: dbVideo.twelveLabsIndexId,
        videoId: dbVideo.twelveLabsVideoId,
      };
    }

    return { indexId, videoId };
  }

  private async fetchChaptersFromApi(videoId: string): Promise<VideoChapter[]> {
    const client = this.getClient();
    const chapters = await client.generateChapters(videoId);
    return chapters.map((ch) => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      summary: ch.summary,
      startSec: ch.startSec,
      endSec: ch.endSec,
    }));
  }

  private async fetchHighlightsFromApi(
    videoId: string
  ): Promise<VideoHighlight[]> {
    const client = this.getClient();
    const highlights = await client.generateHighlights(videoId);
    return highlights.map((h) => ({
      highlight: h.highlight,
      summary: h.summary,
      startSec: h.startSec,
      endSec: h.endSec,
    }));
  }

  private fetchSummaryFromApi(videoId: string): Promise<string> {
    const client = this.getClient();
    return client.generateSummary(videoId);
  }

  private fetchTranscriptFromApi(
    indexId: string,
    videoId: string
  ): Promise<TranscriptSegment[]> {
    const client = this.getClient();
    return client.getVideoTranscriptWithTimestamps(indexId, videoId);
  }

  private async updateVespaChapters(
    vespaId: string,
    chapters: VideoChapter[]
  ): Promise<void> {
    await vespaClient.updateVideoDocument(vespaId, {
      chapters: chapters.map((c) => JSON.stringify(c)),
    });
  }

  private async updateVespaHighlights(
    vespaId: string,
    highlights: VideoHighlight[]
  ): Promise<void> {
    await vespaClient.updateVideoDocument(vespaId, {
      highlights: highlights.map((h) => JSON.stringify(h)),
    });
  }

  private async updateVespaSummary(
    vespaId: string,
    summary: string
  ): Promise<void> {
    await vespaClient.updateVideoDocument(vespaId, {
      video_summary: summary,
    });
  }

  private async updateVespaTranscriptSegments(
    vespaId: string,
    segments: TranscriptSegment[]
  ): Promise<void> {
    await vespaClient.updateVideoDocument(vespaId, {
      transcript_segments: segments.map((s) => JSON.stringify(s)),
    });
  }

  private extractCachedContent(doc: VespaVideoDoc): CachedVideoContent {
    return {
      summary: doc.video_summary ?? null,
      chapters: this.parseChapters(doc.chapters ?? []),
      highlights: this.parseHighlights(doc.highlights ?? []),
      transcriptSegments: this.parseTranscriptSegments(
        doc.transcript_segments ?? []
      ),
    };
  }

  private parseChapters(chapters: string[]): VideoChapter[] {
    return chapters.map((ch) => {
      const parsed = JSON.parse(ch) as VideoChapter & {
        start?: number;
        end?: number;
      };
      return {
        chapterNumber: parsed.chapterNumber ?? 0,
        title: parsed.title ?? "",
        summary: parsed.summary ?? "",
        startSec: parsed.startSec ?? parsed.start ?? 0,
        endSec: parsed.endSec ?? parsed.end ?? 0,
      };
    });
  }

  private parseHighlights(highlights: string[]): VideoHighlight[] {
    return highlights.map((h) => {
      const parsed = JSON.parse(h) as VideoHighlight & {
        description?: string;
        start?: number;
        end?: number;
      };
      return {
        highlight: parsed.highlight ?? parsed.description ?? "",
        summary: parsed.summary ?? "",
        startSec: parsed.startSec ?? parsed.start ?? 0,
        endSec: parsed.endSec ?? parsed.end ?? 0,
      };
    });
  }

  private parseTranscriptSegments(segments: string[]): TranscriptSegment[] {
    return segments.map((s) => {
      const parsed = JSON.parse(s) as TranscriptSegment;
      return {
        start: parsed.start ?? 0,
        end: parsed.end ?? 0,
        value: parsed.value ?? "",
      };
    });
  }
}

export const videoMetadataService = new VideoMetadataService();
