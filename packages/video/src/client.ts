import { TwelveLabs } from "twelvelabs-js";
import { getVideoConfig } from "./config";
import type { VideoMetadata, VideoSegment } from "./types";

export class TwelveLabsClient {
  private client: TwelveLabs | null = null;
  private readonly modelName: "marengo3.0" | "marengo2.7";

  constructor(options: { modelName?: "marengo3.0" | "marengo2.7" } = {}) {
    this.modelName = options.modelName ?? "marengo3.0";
  }

  private getClient(): TwelveLabs {
    if (this.client) {
      return this.client;
    }

    const config = getVideoConfig();
    if (!config.apiKey) {
      throw new Error("TwelveLabs API key not configured");
    }

    this.client = new TwelveLabs({ apiKey: config.apiKey });
    return this.client;
  }

  async createIndex(
    name: string,
    options: {
      models?: Array<{
        modelName: "marengo3.0" | "marengo2.7" | "pegasus1.2";
        modelOptions: Array<"visual" | "audio">;
      }>;
    } = {}
  ): Promise<string> {
    const client = this.getClient();

    const models = options.models ?? [
      { modelName: "marengo3.0", modelOptions: ["visual", "audio"] },
      { modelName: "pegasus1.2", modelOptions: ["visual", "audio"] },
    ];

    const index = await client.indexes.create({
      indexName: name,
      models,
    });

    if (!index.id) {
      throw new Error("Failed to create index: no ID returned");
    }

    return index.id;
  }

  async indexVideo(
    indexId: string,
    videoUrl: string,
    options: { enableVideoStream?: boolean } = {}
  ): Promise<string> {
    const client = this.getClient();

    const task = await client.tasks.create({
      indexId,
      videoUrl,
      enableVideoStream: options.enableVideoStream,
    });

    if (!task.id) {
      throw new Error("Failed to create indexing task: no ID returned");
    }

    // TODO: Switch to TwelveLabs webhook notifications for task completion
    // to avoid long-running polling. See: https://docs.twelvelabs.io/docs/webhooks
    let taskStatus = await client.tasks.retrieve(task.id);
    while (
      taskStatus.status !== "ready" &&
      taskStatus.status !== "failed" &&
      taskStatus.status !== "deleted"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      taskStatus = await client.tasks.retrieve(task.id);
    }

    if (taskStatus.status === "failed") {
      throw new Error(`Video indexing task failed for task: ${task.id}`);
    }

    if (taskStatus.status === "deleted") {
      throw new Error("Video indexing task was deleted");
    }

    if (!taskStatus.videoId) {
      throw new Error("No video ID returned from completed task");
    }

    return taskStatus.videoId;
  }

  async generateEmbeddings(
    videoUrl: string,
    options: {
      segmentDurationSec?: number;
      embeddingOption?: Array<"visual" | "audio" | "transcription">;
    } = {}
  ): Promise<{ segments: VideoSegment[]; videoEmbedding: number[] }> {
    const client = this.getClient();

    const response = await client.embed.v2.create({
      inputType: "video",
      modelName: this.modelName,
      video: {
        mediaSource: { url: videoUrl },
        segmentation: options.segmentDurationSec
          ? {
              strategy: "fixed",
              fixed: { durationSec: options.segmentDurationSec },
            }
          : undefined,
        embeddingOption: options.embeddingOption ?? [
          "visual",
          "audio",
          "transcription",
        ],
        embeddingScope: ["clip", "asset"],
      },
    });

    const segments: VideoSegment[] = [];
    let videoEmbedding: number[] = [];

    for (const item of response.data) {
      if (item.embeddingScope === "asset") {
        videoEmbedding = item.embedding;
      } else if (item.embeddingScope === "clip") {
        segments.push({
          segmentId: `seg_${segments.length}`,
          startTime: item.startSec ?? 0,
          endTime: item.endSec ?? 0,
          embedding: item.embedding,
        });
      }
    }

    return { segments, videoEmbedding };
  }

  async generateEmbeddingsAsync(
    videoUrl: string,
    options: {
      segmentDurationSec?: number;
      embeddingOption?: Array<"visual" | "audio" | "transcription">;
    } = {}
  ): Promise<{ segments: VideoSegment[]; videoEmbedding: number[] }> {
    const client = this.getClient();

    const task = await client.embed.v2.tasks.create({
      inputType: "video",
      modelName: this.modelName,
      video: {
        mediaSource: { url: videoUrl },
        segmentation: options.segmentDurationSec
          ? {
              strategy: "fixed",
              fixed: { durationSec: options.segmentDurationSec },
            }
          : undefined,
        embeddingOption: options.embeddingOption ?? [
          "visual",
          "audio",
          "transcription",
        ],
        embeddingScope: ["clip", "asset"],
      },
    });

    // TODO: Switch to TwelveLabs webhook notifications for task completion
    // to avoid long-running polling. See: https://docs.twelvelabs.io/docs/webhooks
    let result = await client.embed.v2.tasks.retrieve(task.id);
    while (result.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      result = await client.embed.v2.tasks.retrieve(task.id);
    }

    if (result.status === "failed") {
      throw new Error(`Video embedding task failed: ${task.id}`);
    }

    const segments: VideoSegment[] = [];
    let videoEmbedding: number[] = [];

    for (const item of result.data ?? []) {
      if (item.embeddingScope === "asset") {
        videoEmbedding = item.embedding;
      } else if (item.embeddingScope === "clip") {
        segments.push({
          segmentId: `seg_${segments.length}`,
          startTime: item.startSec ?? 0,
          endTime: item.endSec ?? 0,
          embedding: item.embedding,
        });
      }
    }

    return { segments, videoEmbedding };
  }

  async embedText(query: string): Promise<number[]> {
    const client = this.getClient();

    const response = await client.embed.v2.create({
      inputType: "text",
      modelName: this.modelName,
      text: { inputText: query },
    });

    const firstItem = response.data?.[0];
    if (!firstItem) {
      throw new Error("No text embedding returned from TwelveLabs");
    }

    return firstItem.embedding;
  }

  async generateGist(
    videoId: string,
    types: Array<"title" | "topic" | "hashtag"> = ["title", "topic", "hashtag"]
  ): Promise<{ title?: string; topics?: string[]; hashtags?: string[] }> {
    const client = this.getClient();

    const gist = await client.gist({
      videoId,
      types,
    });

    return {
      title: gist.title,
      topics: gist.topics,
      hashtags: gist.hashtags,
    };
  }

  async generateSummary(
    videoId: string,
    options: { prompt?: string; temperature?: number } = {}
  ): Promise<string> {
    const client = this.getClient();

    const result = await client.summarize({
      videoId,
      type: "summary",
      prompt: options.prompt,
      temperature: options.temperature,
    });

    if ("summary" in result) {
      return result.summary ?? "";
    }

    return "";
  }

  async generateChapters(
    videoId: string,
    options: { prompt?: string } = {}
  ): Promise<
    Array<{
      chapterNumber: number;
      startSec: number;
      endSec: number;
      title: string;
      summary: string;
    }>
  > {
    const client = this.getClient();

    const result = await client.summarize({
      videoId,
      type: "chapter",
      prompt: options.prompt,
    });

    if ("chapters" in result && Array.isArray(result.chapters)) {
      return result.chapters.map((chapter) => ({
        chapterNumber: chapter.chapterNumber ?? 0,
        startSec: chapter.startSec ?? 0,
        endSec: chapter.endSec ?? 0,
        title: chapter.chapterTitle ?? "",
        summary: chapter.chapterSummary ?? "",
      }));
    }

    return [];
  }

  async generateHighlights(
    videoId: string,
    options: { prompt?: string } = {}
  ): Promise<
    Array<{
      startSec: number;
      endSec: number;
      highlight: string;
      summary: string;
    }>
  > {
    const client = this.getClient();

    const result = await client.summarize({
      videoId,
      type: "highlight",
      prompt: options.prompt,
    });

    if ("highlights" in result && Array.isArray(result.highlights)) {
      return result.highlights.map((h) => ({
        startSec: h.startSec ?? 0,
        endSec: h.endSec ?? 0,
        highlight: h.highlight ?? "",
        summary: h.highlightSummary ?? "",
      }));
    }

    return [];
  }

  async generateMetadata(
    indexId: string,
    videoId: string
  ): Promise<VideoMetadata> {
    const [gist, summaryText, chapters, highlights] = await Promise.all([
      this.generateGist(videoId),
      this.generateSummary(videoId),
      this.generateChapters(videoId),
      this.generateHighlights(videoId),
    ]);

    let duration = 0;
    let thumbnailUrl: string | undefined;
    try {
      const asset = await this.retrieveIndexedAsset(indexId, videoId);
      duration = asset.systemMetadata?.duration ?? 0;
      const thumbnailUrls = asset.hls?.thumbnailUrls;
      if (thumbnailUrls && thumbnailUrls.length > 0) {
        thumbnailUrl = thumbnailUrls[0];
      }
    } catch {
      // ignore
    }

    return {
      summary: summaryText,
      keywords: gist.topics ?? [],
      duration,
      thumbnailUrl,
      chapters: chapters.map((ch) => ({
        title: ch.title,
        start: ch.startSec,
        end: ch.endSec,
      })),
      highlights: highlights.map((h) => ({
        description: h.highlight,
        start: h.startSec,
        end: h.endSec,
      })),
    };
  }

  async getVideoTranscript(indexId: string, videoId: string): Promise<string> {
    const client = this.getClient();

    const asset = await client.indexes.indexedAssets.retrieve(
      indexId,
      videoId,
      { transcription: true }
    );

    if (asset.transcription && Array.isArray(asset.transcription)) {
      return asset.transcription.map((item) => item.value ?? "").join(" ");
    }

    return "";
  }

  async getVideoTranscriptWithTimestamps(
    indexId: string,
    videoId: string
  ): Promise<Array<{ start: number; end: number; value: string }>> {
    const client = this.getClient();

    const asset = await client.indexes.indexedAssets.retrieve(
      indexId,
      videoId,
      {
        transcription: true,
      }
    );

    if (asset.transcription && Array.isArray(asset.transcription)) {
      return asset.transcription.map((item) => ({
        start: item.start ?? 0,
        end: item.end ?? 0,
        value: item.value ?? "",
      }));
    }

    return [];
  }

  async analyzeVideo(
    videoId: string,
    prompt: string,
    options: { temperature?: number } = {}
  ): Promise<string> {
    const client = this.getClient();

    const result = await client.analyze({
      videoId,
      prompt,
      temperature: options.temperature ?? 0.2,
    });

    return result.data ?? "";
  }

  retrieveIndex(indexId: string) {
    const client = this.getClient();
    return client.indexes.retrieve(indexId);
  }

  listIndexes(options: { page?: number; pageLimit?: number } = {}) {
    const client = this.getClient();
    return client.indexes.list({
      page: options.page,
      pageLimit: options.pageLimit,
    });
  }

  deleteIndex(indexId: string): Promise<void> {
    const client = this.getClient();
    return client.indexes.delete(indexId);
  }

  retrieveIndexedAsset(
    indexId: string,
    indexedAssetId: string,
    options: {
      embeddingOption?: Array<"visual" | "audio" | "transcription">;
      transcription?: boolean;
    } = {}
  ) {
    const client = this.getClient();
    return client.indexes.indexedAssets.retrieve(indexId, indexedAssetId, {
      embeddingOption: options.embeddingOption,
      transcription: options.transcription,
    });
  }

  listIndexedAssets(
    indexId: string,
    options: { page?: number; pageLimit?: number } = {}
  ) {
    const client = this.getClient();
    return client.indexes.indexedAssets.list(indexId, {
      page: options.page,
      pageLimit: options.pageLimit,
    });
  }

  deleteIndexedAsset(indexId: string, indexedAssetId: string): Promise<void> {
    const client = this.getClient();
    return client.indexes.indexedAssets.delete(indexId, indexedAssetId);
  }

  async searchByImage(
    indexId: string,
    imageSource: string | { url: string },
    options: {
      threshold?: "high" | "medium" | "low" | "none";
      pageLimit?: number;
    } = {}
  ): Promise<ImageSearchResult[]> {
    const client = this.getClient();

    const queryMediaUrl =
      typeof imageSource === "string" ? imageSource : imageSource.url;

    const result = await client.search.query({
      indexId,
      queryMediaType: "image",
      queryMediaUrl,
      searchOptions: ["visual"],
      threshold: options.threshold ?? "medium",
      pageLimit: options.pageLimit ?? 10,
    });

    return result.data
      .filter(
        (clip): clip is typeof clip & { videoId: string } =>
          clip.videoId !== undefined
      )
      .map((clip) => ({
        videoId: clip.videoId,
        score: clip.score ?? 0,
        startSec: clip.start ?? 0,
        endSec: clip.end ?? 0,
        confidence: clip.confidence ?? "unknown",
        thumbnailUrl: clip.thumbnailUrl,
      }));
  }

  async searchByText(
    indexId: string,
    queryText: string,
    options: {
      threshold?: "high" | "medium" | "low" | "none";
      pageLimit?: number;
    } = {}
  ): Promise<ImageSearchResult[]> {
    const client = this.getClient();

    const result = await client.search.query({
      indexId,
      queryText,
      searchOptions: ["visual"],
      threshold: options.threshold ?? "medium",
      pageLimit: options.pageLimit ?? 10,
    });

    return result.data
      .filter(
        (clip): clip is typeof clip & { videoId: string } =>
          clip.videoId !== undefined
      )
      .map((clip) => ({
        videoId: clip.videoId,
        score: clip.score ?? 0,
        startSec: clip.start ?? 0,
        endSec: clip.end ?? 0,
        confidence: clip.confidence ?? "unknown",
        thumbnailUrl: clip.thumbnailUrl,
      }));
  }
}

export interface ImageSearchResult {
  videoId: string;
  score: number;
  startSec: number;
  endSec: number;
  confidence: string;
  thumbnailUrl?: string;
}

export const twelveLabsClient = new TwelveLabsClient();
