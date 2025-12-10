import { VideoIndexer } from "../indexing/video-indexer";

export type VideoInteractionAction =
  | "view"
  | "click"
  | "share"
  | "complete"
  | "skip"
  | "like"
  | "comment";

export interface VideoInteraction {
  videoId: string;
  userId: string;
  teamId: string;
  action: VideoInteractionAction;
  timestamp: number;
  watchDuration?: number;
  totalDuration?: number;
  searchQuery?: string;
  position?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface VideoStats {
  videoId: string;
  viewCount: number;
  uniqueViewers: number;
  avgWatchPercentage: number;
  shareCount: number;
  commentCount: number;
  likeCount: number;
  completionRate: number;
}

export interface VideoAnalyticsConfig {
  flushInterval?: number;
  batchSize?: number;
}

type InteractionStore = Map<string, VideoInteraction[]>;

export class VideoAnalyticsService {
  private readonly indexer: VideoIndexer;
  private readonly interactions: InteractionStore = new Map();
  private readonly config: Required<VideoAnalyticsConfig>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(indexer: VideoIndexer, config: VideoAnalyticsConfig = {}) {
    this.indexer = indexer;
    this.config = {
      flushInterval: config.flushInterval ?? 60_000,
      batchSize: config.batchSize ?? 100,
    };
  }

  trackInteraction(interaction: VideoInteraction): void {
    const { videoId } = interaction;
    const existing = this.interactions.get(videoId) ?? [];
    existing.push(interaction);
    this.interactions.set(videoId, existing);

    if (existing.length >= this.config.batchSize) {
      this.flushVideo(videoId).catch(() => {
        // Fire-and-forget
      });
    }
  }

  startAutoFlush(): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setInterval(() => {
      this.flushAll().catch(() => {
        // Fire-and-forget
      });
    }, this.config.flushInterval);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flushAll(): Promise<void> {
    const videoIds = Array.from(this.interactions.keys());
    await Promise.all(videoIds.map((id) => this.flushVideo(id)));
  }

  async flushVideo(videoId: string): Promise<void> {
    const interactions = this.interactions.get(videoId);
    if (!interactions || interactions.length === 0) {
      return;
    }

    this.interactions.delete(videoId);

    const stats = this.aggregateStats(videoId, interactions);
    await this.updateEngagementMetrics(videoId, stats);
  }

  private aggregateStats(
    videoId: string,
    interactions: VideoInteraction[]
  ): VideoStats {
    const uniqueUsers = new Set<string>();
    let viewCount = 0;
    let shareCount = 0;
    let commentCount = 0;
    let likeCount = 0;
    let completions = 0;
    let totalWatchPercentage = 0;
    let watchSamples = 0;

    for (const interaction of interactions) {
      uniqueUsers.add(interaction.userId);

      switch (interaction.action) {
        case "view":
        case "click":
          viewCount += 1;
          break;
        case "share":
          shareCount += 1;
          break;
        case "comment":
          commentCount += 1;
          break;
        case "like":
          likeCount += 1;
          break;
        case "complete":
          completions += 1;
          break;
        default:
          break;
      }

      if (
        interaction.watchDuration !== undefined &&
        interaction.totalDuration !== undefined &&
        interaction.totalDuration > 0
      ) {
        totalWatchPercentage +=
          interaction.watchDuration / interaction.totalDuration;
        watchSamples += 1;
      }
    }

    const avgWatchPercentage =
      watchSamples > 0 ? totalWatchPercentage / watchSamples : 0;
    const completionRate = viewCount > 0 ? completions / viewCount : 0;

    return {
      videoId,
      viewCount,
      uniqueViewers: uniqueUsers.size,
      avgWatchPercentage: Math.min(avgWatchPercentage, 1),
      shareCount,
      commentCount,
      likeCount,
      completionRate,
    };
  }

  private async updateEngagementMetrics(
    videoId: string,
    stats: VideoStats
  ): Promise<void> {
    const trendingScore = this.calculateTrendingScore(stats);

    await this.indexer.updateVideoEngagement(videoId, {
      viewCount: stats.viewCount,
      uniqueViewers: stats.uniqueViewers,
      avgWatchPercentage: stats.avgWatchPercentage,
      shareCount: stats.shareCount,
      commentCount: stats.commentCount,
      trendingScore,
    });
  }

  private calculateTrendingScore(stats: VideoStats): number {
    const viewWeight = 1.0;
    const shareWeight = 3.0;
    const commentWeight = 2.0;
    const completionWeight = 2.0;

    return (
      stats.viewCount * viewWeight +
      stats.shareCount * shareWeight +
      stats.commentCount * commentWeight +
      stats.completionRate * completionWeight * 10
    );
  }

  getVideoStats(videoId: string): VideoStats | null {
    const interactions = this.interactions.get(videoId);
    if (!interactions || interactions.length === 0) {
      return null;
    }
    return this.aggregateStats(videoId, interactions);
  }
}

export function createVideoAnalyticsService(
  indexer?: VideoIndexer,
  config?: VideoAnalyticsConfig
): VideoAnalyticsService {
  return new VideoAnalyticsService(indexer ?? new VideoIndexer(), config);
}
