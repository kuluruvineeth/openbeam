import { getServerClient } from "../clients/server";
import { calculateCost, type LLMProvider } from "./costs";

export interface LLMGenerationEvent {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  model: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  latencyMs: number;
  timeToFirstTokenMs?: number;
  tokensPerSecond?: number;
  estimatedCostUsd: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  workflow: string;
  userId: string;
  teamId: string;
}

export interface LLMFeedbackEvent {
  traceId: string;
  score: -1 | 0 | 1;
  feedbackType: "thumbs" | "rating" | "correction";
  comment?: string;
}

export interface LLMSpanEvent {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  spanType: "tool_call" | "retrieval" | "rerank" | "embedding" | "completion";
  spanName: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export const llmAnalytics = {
  trackGeneration: (event: LLMGenerationEvent) => {
    const client = getServerClient();

    const cost =
      event.estimatedCostUsd > 0
        ? event.estimatedCostUsd
        : calculateCost(
            event.model,
            event.inputTokens,
            event.outputTokens,
            event.cachedTokens
          );

    client.capture({
      distinctId: event.userId,
      event: "$ai_generation",
      properties: {
        $ai_trace_id: event.traceId,
        $ai_span_id: event.spanId,
        $ai_parent_id: event.parentSpanId,
        $ai_model: event.model,
        $ai_provider: event.provider,
        $ai_input_tokens: event.inputTokens,
        $ai_output_tokens: event.outputTokens,
        $ai_cached_tokens: event.cachedTokens,
        $ai_latency_ms: event.latencyMs,
        $ai_time_to_first_token_ms: event.timeToFirstTokenMs,
        $ai_tokens_per_second: event.tokensPerSecond,
        $ai_total_cost_usd: cost,
        $ai_is_error: !event.success,
        $ai_error_code: event.errorCode,
        $ai_error_message: event.errorMessage,
        workflow: event.workflow,
      },
      groups: { team: event.teamId },
    });
  },

  trackFeedback: (
    userId: string,
    feedback: LLMFeedbackEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId: userId,
      event: "$ai_feedback",
      properties: {
        $ai_trace_id: feedback.traceId,
        score: feedback.score,
        feedback_type: feedback.feedbackType,
        comment: feedback.comment,
      },
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  trackSpan: (userId: string, span: LLMSpanEvent, teamId?: string) => {
    const client = getServerClient();
    client.capture({
      distinctId: userId,
      event: "$ai_span",
      properties: {
        $ai_trace_id: span.traceId,
        $ai_span_id: span.spanId,
        $ai_parent_id: span.parentSpanId,
        $ai_span_type: span.spanType,
        span_name: span.spanName,
        duration_ms: span.durationMs,
        success: span.success,
        ...span.metadata,
      },
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  trackError: (options: {
    userId: string;
    traceId: string;
    errorCode: string;
    errorMessage: string;
    teamId?: string;
  }) => {
    const client = getServerClient();
    client.capture({
      distinctId: options.userId,
      event: "$ai_error",
      properties: {
        $ai_trace_id: options.traceId,
        error_code: options.errorCode,
        error_message: options.errorMessage,
      },
      groups: options.teamId ? { team: options.teamId } : undefined,
    });
  },
};

export function createGenerationTracker(
  userId: string,
  teamId: string,
  workflow: string
): {
  start: (traceId: string, model: string, provider: LLMProvider) => void;
  end: (
    inputTokens: number,
    outputTokens: number,
    options?: { cachedTokens?: number; error?: Error }
  ) => void;
} {
  let startTime: number;
  let currentTraceId: string;
  let currentModel: string;
  let currentProvider: LLMProvider;
  let firstTokenTime: number | undefined;

  return {
    start: (traceId: string, model: string, provider: LLMProvider) => {
      startTime = performance.now();
      currentTraceId = traceId;
      currentModel = model;
      currentProvider = provider;
      firstTokenTime = undefined;
    },

    end: (
      inputTokens: number,
      outputTokens: number,
      options?: { cachedTokens?: number; error?: Error }
    ) => {
      const endTime = performance.now();
      const latencyMs = endTime - startTime;
      const tokensPerSecond =
        outputTokens > 0 ? (outputTokens / latencyMs) * 1000 : 0;

      llmAnalytics.trackGeneration({
        traceId: currentTraceId,
        model: currentModel,
        provider: currentProvider,
        inputTokens,
        outputTokens,
        cachedTokens: options?.cachedTokens,
        latencyMs,
        timeToFirstTokenMs: firstTokenTime
          ? firstTokenTime - startTime
          : undefined,
        tokensPerSecond,
        estimatedCostUsd: calculateCost(
          currentModel,
          inputTokens,
          outputTokens,
          options?.cachedTokens
        ),
        success: !options?.error,
        errorCode: options?.error?.name,
        errorMessage: options?.error?.message,
        workflow,
        userId,
        teamId,
      });
    },
  };
}
