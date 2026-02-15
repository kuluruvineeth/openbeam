import prisma, { findIndexedMediaByVespaId } from "@openplane/db";
import { TwelveLabsClient } from "@openplane/media";
import type { MediaDocument } from "@openplane/vespa";
import { vespaClient } from "@openplane/vespa";
import type {
  ServiceMediaChapter,
  ServiceMediaHighlight,
  TranscriptSegment,
} from "./types";

interface MediaMetadataJson {
  twelveLabsIndexId?: string;
  twelveLabsAssetId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

type VespaMediaDoc = Pick<
  MediaDocument,
  "media_summary" | "chapters" | "highlights" | "transcript_segments"
> & {
  metadata?: MediaMetadataJson | string;
};

export type ContentType = "chapters" | "highlights" | "summary" | "transcript";

export interface ServiceMediaMetadata {
  vespaId: string;
  summary: string;
  chapters: ServiceMediaChapter[];
  highlights: ServiceMediaHighlight[];
  transcriptSegments: TranscriptSegment[];
}

export interface CachedMediaContent {
  summary: string | null;
  chapters: ServiceMediaChapter[];
  highlights: ServiceMediaHighlight[];
  transcriptSegments: TranscriptSegment[];
}

interface TwelveLabsIds {
  indexId: string;
  assetId: string;
}

export class MediaMetadataService {
  private client: TwelveLabsClient | null = null;

  private getClient(): TwelveLabsClient {
    if (!this.client) {
      this.client = new TwelveLabsClient();
    }
    return this.client;
  }

  async getMediaMetadata(vespaId: string): Promise<CachedMediaContent | null> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    if (!doc) {
      return null;
    }
    return this.extractCachedContent(doc);
  }

  async getChapters(
    vespaId: string,
    forceRefresh = false
  ): Promise<ServiceMediaChapter[]> {
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

    const chapters = await this.fetchChaptersFromApi(ids.assetId);
    await this.updateVespaChapters(vespaId, chapters);
    return chapters;
  }

  async getHighlights(
    vespaId: string,
    forceRefresh = false
  ): Promise<ServiceMediaHighlight[]> {
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

    const highlights = await this.fetchHighlightsFromApi(ids.assetId);
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

    const summary = await this.fetchSummaryFromApi(ids.assetId);
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
      ids.assetId
    );
    await this.updateVespaTranscriptSegments(vespaId, segments);
    return segments;
  }

  async regenerateContent(
    vespaId: string,
    contentTypes: ContentType[]
  ): Promise<CachedMediaContent> {
    const ids = await this.getTwelveLabsIds(vespaId);
    if (!ids) {
      throw new Error(`TwelveLabs IDs not found for media: ${vespaId}`);
    }

    const results: CachedMediaContent = {
      summary: null,
      chapters: [],
      highlights: [],
      transcriptSegments: [],
    };

    const tasks = contentTypes.map(async (type: ContentType) => {
      switch (type) {
        case "chapters": {
          results.chapters = await this.fetchChaptersFromApi(ids.assetId);
          await this.updateVespaChapters(vespaId, results.chapters);
          break;
        }
        case "highlights": {
          results.highlights = await this.fetchHighlightsFromApi(ids.assetId);
          await this.updateVespaHighlights(vespaId, results.highlights);
          break;
        }
        case "summary": {
          results.summary = await this.fetchSummaryFromApi(ids.assetId);
          await this.updateVespaSummary(vespaId, results.summary);
          break;
        }
        case "transcript": {
          results.transcriptSegments = await this.fetchTranscriptFromApi(
            ids.indexId,
            ids.assetId
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

  private async getCachedChapters(
    vespaId: string
  ): Promise<ServiceMediaChapter[]> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    if (!doc?.chapters?.length) {
      return [];
    }
    return this.parseChapters(doc.chapters);
  }

  private async getCachedHighlights(
    vespaId: string
  ): Promise<ServiceMediaHighlight[]> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    if (!doc?.highlights?.length) {
      return [];
    }
    return this.parseHighlights(doc.highlights);
  }

  private async getCachedSummary(vespaId: string): Promise<string | null> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    return doc?.media_summary ?? null;
  }

  private async getCachedTranscriptSegments(
    vespaId: string
  ): Promise<TranscriptSegment[]> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    if (!doc?.transcript_segments?.length) {
      return [];
    }
    return this.parseTranscriptSegments(doc.transcript_segments);
  }

  private async getTwelveLabsIds(
    vespaId: string
  ): Promise<TwelveLabsIds | null> {
    const doc = (await vespaClient.getMediaDocument(
      vespaId
    )) as VespaMediaDoc | null;
    if (!doc?.metadata) {
      return null;
    }

    const metadata: MediaMetadataJson =
      typeof doc.metadata === "string"
        ? (JSON.parse(doc.metadata) as MediaMetadataJson)
        : doc.metadata;

    const indexId = metadata.twelveLabsIndexId;
    const assetId = metadata.twelveLabsAssetId;

    if (!(indexId && assetId)) {
      const dbMedia = await findIndexedMediaByVespaId(prisma, vespaId);

      if (!(dbMedia?.twelveLabsIndexId && dbMedia?.twelveLabsAssetId)) {
        return null;
      }

      return {
        indexId: dbMedia.twelveLabsIndexId,
        assetId: dbMedia.twelveLabsAssetId,
      };
    }

    return { indexId, assetId };
  }

  private async fetchChaptersFromApi(
    assetId: string
  ): Promise<ServiceMediaChapter[]> {
    const client = this.getClient();
    const chapters = await client.generateChapters(assetId);
    return chapters.map((ch) => ({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      summary: ch.summary,
      startSec: ch.startSec,
      endSec: ch.endSec,
    }));
  }

  private async fetchHighlightsFromApi(
    assetId: string
  ): Promise<ServiceMediaHighlight[]> {
    const client = this.getClient();
    const highlights = await client.generateHighlights(assetId);
    return highlights.map((h) => ({
      highlight: h.highlight,
      summary: h.summary,
      startSec: h.startSec,
      endSec: h.endSec,
    }));
  }

  private fetchSummaryFromApi(assetId: string): Promise<string> {
    const client = this.getClient();
    return client.generateSummary(assetId);
  }

  private fetchTranscriptFromApi(
    indexId: string,
    assetId: string
  ): Promise<TranscriptSegment[]> {
    const client = this.getClient();
    return client.getVideoTranscriptWithTimestamps(indexId, assetId);
  }

  private async updateVespaChapters(
    vespaId: string,
    chapters: ServiceMediaChapter[]
  ): Promise<void> {
    await vespaClient.updateMediaDocument(vespaId, {
      chapters: chapters.map((c) => JSON.stringify(c)),
    });
  }

  private async updateVespaHighlights(
    vespaId: string,
    highlights: ServiceMediaHighlight[]
  ): Promise<void> {
    await vespaClient.updateMediaDocument(vespaId, {
      highlights: highlights.map((h) => JSON.stringify(h)),
    });
  }

  private async updateVespaSummary(
    vespaId: string,
    summary: string
  ): Promise<void> {
    await vespaClient.updateMediaDocument(vespaId, {
      media_summary: summary,
    });
  }

  private async updateVespaTranscriptSegments(
    vespaId: string,
    segments: TranscriptSegment[]
  ): Promise<void> {
    await vespaClient.updateMediaDocument(vespaId, {
      transcript_segments: segments.map((s) => JSON.stringify(s)),
    });
  }

  private extractCachedContent(doc: VespaMediaDoc): CachedMediaContent {
    return {
      summary: doc.media_summary ?? null,
      chapters: this.parseChapters(doc.chapters ?? []),
      highlights: this.parseHighlights(doc.highlights ?? []),
      transcriptSegments: this.parseTranscriptSegments(
        doc.transcript_segments ?? []
      ),
    };
  }

  private parseChapters(chapters: string[]): ServiceMediaChapter[] {
    return chapters.map((ch) => {
      const parsed = JSON.parse(ch) as ServiceMediaChapter & {
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

  private parseHighlights(highlights: string[]): ServiceMediaHighlight[] {
    return highlights.map((h) => {
      const parsed = JSON.parse(h) as ServiceMediaHighlight & {
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

export const mediaMetadataService = new MediaMetadataService();
