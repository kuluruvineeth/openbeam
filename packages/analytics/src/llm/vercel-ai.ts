import { getServerClient } from "../clients/server";
import { calculateCost, type LLMProvider } from "./costs";

interface LanguageModelV1 {
  readonly modelId: string;
  readonly provider?: string;
  readonly specificationVersion?: string;
}

interface PostHogObservabilityOptions {
  distinctId: string;
  traceId?: string;
  spanId?: string;
  workflow?: string;
  teamId?: string;
  metadata?: Record<string, unknown>;
}

interface WrappedModelResult {
  model: LanguageModelV1;
  trackUsage: (usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    latencyMs: number;
    success: boolean;
    error?: Error;
  }) => void;
}

function inferProvider(modelId: string): LLMProvider {
  if (modelId.startsWith("claude")) {
    return "anthropic";
  }
  if (modelId.startsWith("gpt") || modelId.startsWith("o1")) {
    return "openai";
  }
  if (modelId.startsWith("gemini")) {
    return "google";
  }
  if (modelId.includes("azure")) {
    return "azure";
  }
  return "ollama";
}

export function withPostHogObservability(
  model: LanguageModelV1,
  options: PostHogObservabilityOptions
): WrappedModelResult {
  const client = getServerClient();
  const traceId = options.traceId ?? crypto.randomUUID();
  const spanId = options.spanId ?? crypto.randomUUID();
  const modelId = model.modelId;
  const provider = inferProvider(modelId);

  const trackUsage = (usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    latencyMs: number;
    success: boolean;
    error?: Error;
  }) => {
    const cost = calculateCost(
      modelId,
      usage.inputTokens,
      usage.outputTokens,
      usage.cachedTokens ?? 0
    );

    client.capture({
      distinctId: options.distinctId,
      event: "$ai_generation",
      properties: {
        $ai_trace_id: traceId,
        $ai_span_id: spanId,
        $ai_model: modelId,
        $ai_provider: provider,
        $ai_input_tokens: usage.inputTokens,
        $ai_output_tokens: usage.outputTokens,
        $ai_cached_tokens: usage.cachedTokens ?? 0,
        $ai_latency_ms: usage.latencyMs,
        $ai_total_cost_usd: cost,
        $ai_is_error: !usage.success,
        $ai_error_code: usage.error?.name,
        $ai_error_message: usage.error?.message,
        workflow: options.workflow,
        ...options.metadata,
      },
      groups: options.teamId ? { team: options.teamId } : undefined,
    });
  };

  return { model, trackUsage };
}

export function createGenerationTraceContext(options: {
  distinctId: string;
  teamId?: string;
  workflow: string;
}): {
  traceId: string;
  createSpan: (spanName: string) => SpanContext;
  complete: () => void;
} {
  const client = getServerClient();
  const traceId = crypto.randomUUID();
  const startTime = performance.now();
  const spans: Array<{
    spanId: string;
    spanName: string;
    startTime: number;
    endTime?: number;
  }> = [];

  return {
    traceId,
    createSpan: (spanName: string): SpanContext => {
      const spanId = crypto.randomUUID();
      const spanStartTime = performance.now();
      spans.push({ spanId, spanName, startTime: spanStartTime });

      return {
        spanId,
        end: (metadata?: Record<string, unknown>) => {
          const span = spans.find((s) => s.spanId === spanId);
          if (span) {
            span.endTime = performance.now();
            client.capture({
              distinctId: options.distinctId,
              event: "$ai_span",
              properties: {
                $ai_trace_id: traceId,
                $ai_span_id: spanId,
                $ai_span_type: "custom",
                span_name: spanName,
                duration_ms: span.endTime - span.startTime,
                ...metadata,
              },
              groups: options.teamId ? { team: options.teamId } : undefined,
            });
          }
        },
      };
    },
    complete: () => {
      const totalDuration = performance.now() - startTime;
      client.capture({
        distinctId: options.distinctId,
        event: "$ai_trace_completed",
        properties: {
          $ai_trace_id: traceId,
          workflow: options.workflow,
          total_duration_ms: totalDuration,
          span_count: spans.length,
        },
        groups: options.teamId ? { team: options.teamId } : undefined,
      });
    },
  };
}

interface SpanContext {
  spanId: string;
  end: (metadata?: Record<string, unknown>) => void;
}

export function trackToolCall(options: {
  distinctId: string;
  traceId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  teamId?: string;
}): {
  complete: (result: {
    success: boolean;
    output?: unknown;
    error?: Error;
  }) => void;
} {
  const client = getServerClient();
  const spanId = crypto.randomUUID();
  const startTime = performance.now();

  return {
    complete: (result) => {
      const duration = performance.now() - startTime;
      client.capture({
        distinctId: options.distinctId,
        event: "$ai_span",
        properties: {
          $ai_trace_id: options.traceId,
          $ai_span_id: spanId,
          $ai_span_type: "tool_call",
          span_name: `tool:${options.toolName}`,
          duration_ms: duration,
          tool_name: options.toolName,
          success: result.success,
          error_message: result.error?.message,
        },
        groups: options.teamId ? { team: options.teamId } : undefined,
      });
    },
  };
}

export function trackRetrieval(options: {
  distinctId: string;
  traceId: string;
  query: string;
  documentCount: number;
  teamId?: string;
}): {
  complete: (result: {
    success: boolean;
    relevanceScores?: number[];
    latencyMs: number;
  }) => void;
} {
  const client = getServerClient();
  const spanId = crypto.randomUUID();

  return {
    complete: (result) => {
      client.capture({
        distinctId: options.distinctId,
        event: "$ai_span",
        properties: {
          $ai_trace_id: options.traceId,
          $ai_span_id: spanId,
          $ai_span_type: "retrieval",
          span_name: "retrieval",
          duration_ms: result.latencyMs,
          query_length: options.query.length,
          document_count: options.documentCount,
          success: result.success,
          avg_relevance_score: result.relevanceScores
            ? result.relevanceScores.reduce((a, b) => a + b, 0) /
              result.relevanceScores.length
            : undefined,
        },
        groups: options.teamId ? { team: options.teamId } : undefined,
      });
    },
  };
}

export function trackEmbedding(options: {
  distinctId: string;
  traceId: string;
  model: string;
  inputCount: number;
  teamId?: string;
}): {
  complete: (result: {
    success: boolean;
    tokenCount: number;
    latencyMs: number;
  }) => void;
} {
  const client = getServerClient();
  const spanId = crypto.randomUUID();

  return {
    complete: (result) => {
      client.capture({
        distinctId: options.distinctId,
        event: "$ai_span",
        properties: {
          $ai_trace_id: options.traceId,
          $ai_span_id: spanId,
          $ai_span_type: "embedding",
          span_name: `embedding:${options.model}`,
          duration_ms: result.latencyMs,
          model: options.model,
          input_count: options.inputCount,
          token_count: result.tokenCount,
          success: result.success,
        },
        groups: options.teamId ? { team: options.teamId } : undefined,
      });
    },
  };
}
