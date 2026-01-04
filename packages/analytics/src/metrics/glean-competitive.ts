import { getServerClient } from "../clients/server";

export interface GleanSearchQualityMetrics {
  mrr: number;
  precision: number;
  recall?: number;
  ndcg?: number;
  timeToFirstClick: number;
  clickThroughRate: number;
  zeroResultRate: number;
  refinementRate: number;
  satisfactionScore: number;
}

export interface SearchSessionMetrics {
  sessionId: string;
  userId: string;
  teamId: string;
  queryCount: number;
  clickCount: number;
  refinementCount: number;
  totalDwellTimeMs: number;
  satisfactionSubmitted: boolean;
  satisfactionScore?: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface TeamSearchMetrics {
  teamId: string;
  period: "day" | "week" | "month";
  totalSearches: number;
  uniqueUsers: number;
  avgQueriesPerUser: number;
  avgClickPosition: number;
  avgMrr: number;
  zeroResultCount: number;
  topQueries: Array<{ query: string; count: number }>;
  topConnectors: Array<{ connector: string; clickCount: number }>;
  satisfactionTrend: Array<{ date: string; avgScore: number }>;
}

export interface AIUsageMetrics {
  teamId: string;
  period: "day" | "week" | "month";
  totalGenerations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
  errorRate: number;
  topWorkflows: Array<{ workflow: string; count: number; costUsd: number }>;
  modelBreakdown: Array<{ model: string; count: number; costUsd: number }>;
}

export interface RAGQualityMetrics {
  teamId: string;
  period: "day" | "week" | "month";
  totalQueries: number;
  avgGroundingScore: number;
  avgRetrievalMs: number;
  avgGenerationMs: number;
  avgDocumentsRetrieved: number;
  avgChunksUsed: number;
  feedbackPositive: number;
  feedbackNegative: number;
  feedbackNeutral: number;
}

export const gleanMetrics = {
  trackSearchSession: (session: SearchSessionMetrics): void => {
    const client = getServerClient();

    const durationMs = session.endedAt
      ? session.endedAt.getTime() - session.startedAt.getTime()
      : 0;

    client.capture({
      distinctId: session.userId,
      event: "search_session_completed",
      properties: {
        session_id: session.sessionId,
        query_count: session.queryCount,
        click_count: session.clickCount,
        refinement_count: session.refinementCount,
        total_dwell_time_ms: session.totalDwellTimeMs,
        session_duration_ms: durationMs,
        satisfaction_submitted: session.satisfactionSubmitted,
        satisfaction_score: session.satisfactionScore,
        queries_per_session: session.queryCount,
        clicks_per_query:
          session.queryCount > 0 ? session.clickCount / session.queryCount : 0,
      },
      groups: { team: session.teamId },
    });
  },

  trackMRR: (options: {
    userId: string;
    teamId: string;
    queryId: string;
    clickPosition: number;
  }): void => {
    const client = getServerClient();
    const mrr = 1 / options.clickPosition;

    client.capture({
      distinctId: options.userId,
      event: "search_mrr_recorded",
      properties: {
        query_id: options.queryId,
        click_position: options.clickPosition,
        mrr,
      },
      groups: { team: options.teamId },
    });
  },

  trackNDCG: (options: {
    userId: string;
    teamId: string;
    queryId: string;
    relevanceScores: number[];
    idealScores: number[];
  }): void => {
    const client = getServerClient();

    const dcg = options.relevanceScores.reduce(
      (sum, rel, i) => sum + (2 ** rel - 1) / Math.log2(i + 2),
      0
    );

    const idcg = options.idealScores.reduce(
      (sum, rel, i) => sum + (2 ** rel - 1) / Math.log2(i + 2),
      0
    );

    const ndcg = idcg > 0 ? dcg / idcg : 0;

    client.capture({
      distinctId: options.userId,
      event: "search_ndcg_recorded",
      properties: {
        query_id: options.queryId,
        dcg,
        idcg,
        ndcg,
        result_count: options.relevanceScores.length,
      },
      groups: { team: options.teamId },
    });
  },

  trackPrecisionAtK: (options: {
    userId: string;
    teamId: string;
    queryId: string;
    k: number;
    relevantCount: number;
  }): void => {
    const client = getServerClient();
    const precision = options.relevantCount / options.k;

    client.capture({
      distinctId: options.userId,
      event: "search_precision_at_k",
      properties: {
        query_id: options.queryId,
        k: options.k,
        relevant_count: options.relevantCount,
        precision,
      },
      groups: { team: options.teamId },
    });
  },

  trackTimeToValue: (options: {
    userId: string;
    teamId: string;
    queryId: string;
    timeToFirstClickMs: number;
    timeToFirstRelevantMs?: number;
    dwellTimeMs: number;
    didFindAnswer: boolean;
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: options.userId,
      event: "search_time_to_value",
      properties: {
        query_id: options.queryId,
        time_to_first_click_ms: options.timeToFirstClickMs,
        time_to_first_relevant_ms: options.timeToFirstRelevantMs,
        dwell_time_ms: options.dwellTimeMs,
        found_answer: options.didFindAnswer,
      },
      groups: { team: options.teamId },
    });
  },

  trackQueryAbandonment: (options: {
    userId: string;
    teamId: string;
    queryId: string;
    resultCount: number;
    timeOnPageMs: number;
    scrollDepthPercent: number;
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: options.userId,
      event: "search_query_abandoned",
      properties: {
        query_id: options.queryId,
        result_count: options.resultCount,
        time_on_page_ms: options.timeOnPageMs,
        scroll_depth_percent: options.scrollDepthPercent,
        had_results: options.resultCount > 0,
      },
      groups: { team: options.teamId },
    });
  },

  trackConnectorCoverage: (options: {
    teamId: string;
    connectorId: string;
    connectorType: string;
    documentCount: number;
    lastSyncAt: Date;
    syncSuccessRate: number;
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: `team:${options.teamId}`,
      event: "connector_coverage_snapshot",
      properties: {
        connector_id: options.connectorId,
        connector_type: options.connectorType,
        document_count: options.documentCount,
        last_sync_at: options.lastSyncAt.toISOString(),
        sync_success_rate: options.syncSuccessRate,
      },
      groups: { team: options.teamId },
    });
  },

  trackRAGQuality: (options: {
    userId: string;
    teamId: string;
    traceId: string;
    groundingScore: number;
    citationCount: number;
    sourceDiversity: number;
    answerLength: number;
    confidence: "high" | "medium" | "low";
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: options.userId,
      event: "rag_quality_scored",
      properties: {
        trace_id: options.traceId,
        grounding_score: options.groundingScore,
        citation_count: options.citationCount,
        source_diversity: options.sourceDiversity,
        answer_length: options.answerLength,
        confidence: options.confidence,
        is_well_grounded: options.groundingScore >= 0.7,
      },
      groups: { team: options.teamId },
    });
  },

  trackAICostAttribution: (options: {
    teamId: string;
    userId: string;
    workflow: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: options.userId,
      event: "ai_cost_attributed",
      properties: {
        workflow: options.workflow,
        model: options.model,
        provider: options.provider,
        input_tokens: options.inputTokens,
        output_tokens: options.outputTokens,
        estimated_cost_usd: options.estimatedCostUsd,
        $set: {
          last_ai_usage_at: new Date().toISOString(),
        },
      },
      groups: { team: options.teamId },
    });

    client.groupIdentify({
      groupType: "team",
      groupKey: options.teamId,
      properties: {
        $set: {
          last_ai_usage_at: new Date().toISOString(),
        },
      },
    });
  },

  trackFeatureAdoption: (options: {
    teamId: string;
    userId: string;
    feature: string;
    action: "first_use" | "active_use" | "power_use";
  }): void => {
    const client = getServerClient();

    client.capture({
      distinctId: options.userId,
      event: "feature_adoption",
      properties: {
        feature: options.feature,
        action: options.action,
        $set: {
          [`${options.feature}_adoption`]: options.action,
          [`${options.feature}_last_used`]: new Date().toISOString(),
        },
      },
      groups: { team: options.teamId },
    });
  },
};

export function calculateSearchQualityScore(
  metrics: GleanSearchQualityMetrics
): number {
  const weights = {
    mrr: 0.25,
    clickThroughRate: 0.2,
    satisfactionScore: 0.2,
    zeroResultRate: 0.15,
    refinementRate: 0.1,
    timeToFirstClick: 0.1,
  };

  const normalizedTimeToClick = Math.max(
    0,
    1 - metrics.timeToFirstClick / 10_000
  );
  const normalizedZeroRate = 1 - metrics.zeroResultRate;
  const normalizedRefinementRate = 1 - metrics.refinementRate;
  const normalizedSatisfaction = metrics.satisfactionScore / 5;

  const score =
    weights.mrr * metrics.mrr +
    weights.clickThroughRate * metrics.clickThroughRate +
    weights.satisfactionScore * normalizedSatisfaction +
    weights.zeroResultRate * normalizedZeroRate +
    weights.refinementRate * normalizedRefinementRate +
    weights.timeToFirstClick * normalizedTimeToClick;

  return Math.round(score * 100) / 100;
}

export function generateSearchQualityReport(
  metrics: GleanSearchQualityMetrics
): {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  insights: string[];
  recommendations: string[];
} {
  const score = calculateSearchQualityScore(metrics);

  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 0.9) {
    grade = "A";
  } else if (score >= 0.8) {
    grade = "B";
  } else if (score >= 0.7) {
    grade = "C";
  } else if (score >= 0.6) {
    grade = "D";
  } else {
    grade = "F";
  }

  const insights: string[] = [];
  const recommendations: string[] = [];

  if (metrics.mrr < 0.5) {
    insights.push(
      "Users are clicking on results beyond the first few positions"
    );
    recommendations.push("Review ranking algorithm and relevance tuning");
  }

  if (metrics.zeroResultRate > 0.1) {
    insights.push(
      `${(metrics.zeroResultRate * 100).toFixed(1)}% of queries return no results`
    );
    recommendations.push(
      "Expand connector coverage or improve query understanding"
    );
  }

  if (metrics.refinementRate > 0.3) {
    insights.push(
      "High query refinement rate indicates initial results are unsatisfactory"
    );
    recommendations.push("Implement query suggestions and auto-complete");
  }

  if (metrics.clickThroughRate < 0.4) {
    insights.push(
      "Low click-through rate suggests result snippets need improvement"
    );
    recommendations.push("Enhance snippet generation and document previews");
  }

  if (metrics.satisfactionScore < 3.5) {
    insights.push("User satisfaction is below target");
    recommendations.push("Conduct user research to identify pain points");
  }

  return { score, grade, insights, recommendations };
}
