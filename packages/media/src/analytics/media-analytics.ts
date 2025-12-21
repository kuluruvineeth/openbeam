import { MediaIndexer } from "../indexing/media-indexer";

export type MediaInteractionAction =
  | "view"
  | "click"
  | "share"
  | "complete"
  | "skip"
  | "like"
  | "comment";

export interface MediaInteraction {
  mediaId: string;
  userId: string;
  teamId: string;
  action: MediaInteractionAction;
  timestamp: number;
  watchDuration?: number;
  totalDuration?: number;
  searchQuery?: string;
  position?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface MediaStats {
  mediaId: string;
  viewCount: number;
  uniqueViewers: number;
  avgWatchPercentage: number;
  shareCount: number;
  commentCount: number;
  likeCount: number;
  completionRate: number;
}

export interface MediaAnalyticsConfig {
  flushInterval?: number;
  batchSize?: number;
}

type InteractionStore = Map<string, MediaInteraction[]>;

export class MediaAnalyticsService {
  private readonly indexer: MediaIndexer;
  private readonly interactions: InteractionStore = new Map();
  private readonly config: Required<MediaAnalyticsConfig>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(indexer: MediaIndexer, config: MediaAnalyticsConfig = {}) {
    this.indexer = indexer;
    this.config = {
      flushInterval: config.flushInterval ?? 60_000,
      batchSize: config.batchSize ?? 100,
    };
  }

  trackInteraction(interaction: MediaInteraction): void {
    const { mediaId } = interaction;
    const existing = this.interactions.get(mediaId) ?? [];
    existing.push(interaction);
    this.interactions.set(mediaId, existing);

    if (existing.length >= this.config.batchSize) {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: fire-and-forget flush, errors are non-critical
      this.flushMedia(mediaId).catch(() => {});
    }
  }

  startAutoFlush(): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setInterval(() => {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: fire-and-forget flush, errors are non-critical
      this.flushAll().catch(() => {});
    }, this.config.flushInterval);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flushAll(): Promise<void> {
    const mediaIds = Array.from(this.interactions.keys());
    await Promise.all(mediaIds.map((id) => this.flushMedia(id)));
  }

  async flushMedia(mediaId: string): Promise<void> {
    const interactions = this.interactions.get(mediaId);
    if (!interactions || interactions.length === 0) {
      return;
    }

    this.interactions.delete(mediaId);

    const stats = this.aggregateStats(mediaId, interactions);
    await this.updateEngagementMetrics(mediaId, stats);
  }

  private aggregateStats(
    mediaId: string,
    interactions: MediaInteraction[]
  ): MediaStats {
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
      mediaId,
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
    mediaId: string,
    stats: MediaStats
  ): Promise<void> {
    const trendingScore = this.calculateTrendingScore(stats);

    await this.indexer.updateMediaEngagement(mediaId, {
      viewCount: stats.viewCount,
      uniqueViewers: stats.uniqueViewers,
      avgWatchPercentage: stats.avgWatchPercentage,
      shareCount: stats.shareCount,
      commentCount: stats.commentCount,
      trendingScore,
    });
  }

  private calculateTrendingScore(stats: MediaStats): number {
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

  getMediaStats(mediaId: string): MediaStats | null {
    const interactions = this.interactions.get(mediaId);
    if (!interactions || interactions.length === 0) {
      return null;
    }
    return this.aggregateStats(mediaId, interactions);
  }
}

export function createMediaAnalyticsService(
  indexer?: MediaIndexer,
  config?: MediaAnalyticsConfig
): MediaAnalyticsService {
  return new MediaAnalyticsService(indexer ?? new MediaIndexer(), config);
}
