/**
 * Analytics Processor
 *
 * Processes analytics events including user interactions, search analytics,
 * and document popularity scoring.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 */
import prisma, {
  getDocumentsIndexedCount,
  getSearchCount,
  getUniqueSearchersCount,
  type InteractionType,
  type PeriodType,
  trackInteraction,
  trackSearch,
  updateDocumentAnalyticsForInteraction,
  updatePopularityScores,
  updateQueryAnalytics,
  upsertTeamUsageMetrics,
} from "@openplane/db";
import { type AnalyticsJobData, createLinkedSpan } from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { workerConfig } from "../config";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

// === Analytics Processor ===

export class AnalyticsProcessor extends BaseProcessor<AnalyticsJobData> {
  constructor() {
    super("analytics", {
      concurrency: workerConfig.analytics.concurrency,
      limiter: workerConfig.analytics.rateLimit,
    });
  }

  protected async processJob(job: Job<AnalyticsJobData>): Promise<unknown> {
    const data = job.data;

    const span = createLinkedSpan(
      "openplane-worker",
      `analytics-processor.${data.type}`,
      data.traceContext,
      {
        "job.id": job.id || "",
        "analytics.type": data.type,
      }
    );

    try {
      logger.debug(
        { jobId: job.id, type: data.type },
        "Processing analytics job"
      );

      switch (data.type) {
        case "track_interaction":
          await this.handleTrackInteraction(data);
          break;

        case "track_search":
          await this.handleTrackSearch(data);
          break;

        case "aggregate_query":
          await this.handleAggregateQuery(data);
          break;

        case "aggregate_document":
          await this.handleAggregateDocument(data);
          break;

        case "aggregate_user":
          await this.handleAggregateUser(data);
          break;

        case "aggregate_team":
          await this.handleAggregateTeam(data);
          break;

        case "update_popularity":
          await this.handleUpdatePopularity(data);
          break;

        case "sync_to_vespa":
          await this.handleSyncToVespa(data);
          break;

        default:
          logger.warn(
            { type: (data as { type: string }).type },
            "Unknown analytics job type"
          );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        { error: errorMessage, jobId: job.id, type: data.type },
        "Analytics job failed"
      );

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Handle user interaction tracking using @db mutations
   */
  private async handleTrackInteraction(
    data: Extract<AnalyticsJobData, { type: "track_interaction" }>
  ): Promise<void> {
    const timestamp = new Date(data.timestamp);

    // Track the interaction using @db mutation
    await trackInteraction(prisma, {
      teamId: data.teamId,
      userId: data.userId,
      type: data.interactionType.toUpperCase() as InteractionType,
      documentId: data.documentId,
      documentType: data.documentType,
      connectorId: data.connectorId,
      searchSessionId: data.searchSessionId,
      searchQuery: data.searchQuery,
      resultPosition: data.resultPosition,
      resultPage: data.resultPage,
      dwellTimeMs: data.dwellTimeMs,
      scrollDepth: data.scrollDepth,
      source: data.source,
      referrer: data.referrer,
      deviceType: data.deviceType,
      metadata: data.metadata,
      timestamp,
    });

    // Update document analytics if applicable
    if (data.documentId) {
      await updateDocumentAnalyticsForInteraction(
        prisma,
        data.teamId,
        data.documentId,
        data.connectorId || null,
        data.interactionType.toUpperCase() as InteractionType,
        timestamp
      );
    }
  }

  /**
   * Handle search session tracking using @db mutations
   */
  private async handleTrackSearch(
    data: Extract<AnalyticsJobData, { type: "track_search" }>
  ): Promise<void> {
    const timestamp = new Date(data.timestamp);

    // Track search session using @db mutation
    await trackSearch(prisma, {
      sessionId: data.sessionId,
      teamId: data.teamId,
      userId: data.userId,
      query: data.query,
      searchType: data.searchType,
      filters: data.filters,
      rankProfile: data.rankProfile,
      totalResults: data.totalResults,
      resultsShown: data.resultsShown,
      resultIds: data.resultIds,
      resultTypes: data.resultTypes,
      latencyMs: data.latencyMs,
      aiAnswerGenerated: data.aiAnswerGenerated,
      timestamp,
    });

    // Update query analytics using @db mutation
    await updateQueryAnalytics(
      prisma,
      data.teamId,
      data.query,
      data.totalResults,
      data.latencyMs,
      timestamp
    );
  }

  /**
   * Handle query analytics aggregation
   */
  private async handleAggregateQuery(
    data: Extract<AnalyticsJobData, { type: "aggregate_query" }>
  ): Promise<void> {
    const { teamId, timeRange } = data;

    // This is handled by the updateQueryAnalytics mutation during tracking
    // This job can be used for additional batch aggregation if needed

    logger.info({ teamId, timeRange }, "Query aggregation triggered");
  }

  /**
   * Handle document analytics aggregation
   */
  private async handleAggregateDocument(
    data: Extract<AnalyticsJobData, { type: "aggregate_document" }>
  ): Promise<void> {
    const { teamId, documentId } = data;

    // Update popularity scores using @db mutation
    const updated = await updatePopularityScores(
      prisma,
      teamId,
      documentId ? [documentId] : undefined
    );

    logger.info(
      { teamId, documentId, documentsUpdated: updated },
      "Document aggregation completed"
    );
  }

  /**
   * Handle user analytics aggregation
   */
  private async handleAggregateUser(
    data: Extract<AnalyticsJobData, { type: "aggregate_user" }>
  ): Promise<void> {
    const { teamId, userId } = data;

    // User analytics are updated during interaction tracking
    // This job can be used for batch recalculation if needed

    logger.info({ teamId, userId }, "User aggregation triggered");
  }

  /**
   * Handle team usage metrics aggregation using @db mutations
   */
  private async handleAggregateTeam(
    data: Extract<AnalyticsJobData, { type: "aggregate_team" }>
  ): Promise<void> {
    const { teamId, periodType, periodStart } = data;

    const periodStartDate = new Date(periodStart);

    // Calculate period end
    let periodEnd: Date;
    switch (periodType) {
      case "hourly":
        periodEnd = new Date(periodStart + 60 * 60 * 1000);
        break;
      case "daily":
        periodEnd = new Date(periodStart + 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        periodEnd = new Date(periodStartDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    // Get metrics using @db queries
    const [searchCount, uniqueSearchers, documentCount] = await Promise.all([
      getSearchCount(prisma, teamId, {
        startDate: periodStartDate,
        endDate: periodEnd,
      }),
      getUniqueSearchersCount(prisma, teamId, {
        startDate: periodStartDate,
        endDate: periodEnd,
      }),
      getDocumentsIndexedCount(prisma, teamId, {
        startDate: periodStartDate,
        endDate: periodEnd,
      }),
    ]);

    // Upsert usage metrics using @db mutation
    await upsertTeamUsageMetrics(
      prisma,
      teamId,
      periodType as PeriodType,
      periodStartDate,
      {
        totalSearches: searchCount,
        uniqueSearchers,
        documentsIndexed: documentCount,
      }
    );

    logger.info(
      {
        teamId,
        periodType,
        searchCount,
        uniqueSearchers,
      },
      "Team usage metrics aggregation completed"
    );
  }

  /**
   * Handle popularity score update using @db mutation
   */
  private async handleUpdatePopularity(
    data: Extract<AnalyticsJobData, { type: "update_popularity" }>
  ): Promise<void> {
    const { teamId, documentIds } = data;

    const updated = await updatePopularityScores(prisma, teamId, documentIds);

    logger.info(
      { teamId, documentsUpdated: updated },
      "Popularity scores updated"
    );
  }

  /**
   * Handle sync to Vespa
   */
  private async handleSyncToVespa(
    data: Extract<AnalyticsJobData, { type: "sync_to_vespa" }>
  ): Promise<void> {
    const { teamId, documentIds, scores } = data;

    // TODO: Implement Vespa update with popularity scores
    logger.info(
      { teamId, documentCount: documentIds.length },
      "Syncing popularity scores to Vespa"
    );

    // For now, just log
    for (const score of scores) {
      logger.debug(
        {
          documentId: score.documentId,
          popularityScore: score.popularityScore,
          trendingScore: score.trendingScore,
        },
        "Would update Vespa document"
      );
    }
  }
}
