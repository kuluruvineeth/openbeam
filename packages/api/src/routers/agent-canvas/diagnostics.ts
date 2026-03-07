import { logger } from "@openbeam/services/lib/logger";

export type BuildStreamDiagnostics = {
  startedAt: number;
  builderEventCount: number;
  mappedPayloadCount: number;
  skippedBuilderEventCount: number;
  emittedRuntimeEventCount: number;
  emittedEphemeralEventCount: number;
  emittedPersistedEventCount: number;
  assistantDeltaChars: number;
  assistantFinalChars: number;
  builderEventTypes: Record<string, number>;
  payloadTypes: Record<string, number>;
  canvasOperationTypes: Record<string, number>;
};

export function incrementCounter(
  counter: Record<string, number>,
  key: string | undefined
): void {
  if (!key) {
    return;
  }
  counter[key] = (counter[key] ?? 0) + 1;
}

function summarizeUnknownValueShape(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { kind: "null" };
  }

  if (value === undefined) {
    return { kind: "undefined" };
  }

  if (Array.isArray(value)) {
    return { kind: "array", length: value.length };
  }

  if (typeof value === "string") {
    return { kind: "string", length: value.length };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { kind: typeof value };
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return {
      kind: "object",
      keyCount: keys.length,
      keysPreview: keys.slice(0, 8),
    };
  }

  return { kind: typeof value };
}

export function summarizeBuilderEvent(event: unknown): Record<string, unknown> {
  const streamEvent = event as { type?: string };

  if (streamEvent.type === "text") {
    const textEvent = event as { type: "text"; chunk: string };
    return { type: "text", chunkLength: textEvent.chunk.length };
  }

  if (streamEvent.type === "thinking") {
    const thinkingEvent = event as { type: "thinking"; content: string };
    return {
      type: "thinking",
      contentLength: thinkingEvent.content.length,
    };
  }

  if (streamEvent.type === "tool_call") {
    const toolCallEvent = event as {
      type: "tool_call";
      id: string;
      tool: string;
      input: unknown;
    };
    return {
      type: "tool_call",
      toolCallId: toolCallEvent.id,
      toolName: toolCallEvent.tool,
      inputShape: summarizeUnknownValueShape(toolCallEvent.input),
    };
  }

  if (streamEvent.type === "tool_result") {
    const toolResultEvent = event as {
      type: "tool_result";
      id: string;
      result: unknown;
    };
    return {
      type: "tool_result",
      toolCallId: toolResultEvent.id,
      resultShape: summarizeUnknownValueShape(toolResultEvent.result),
    };
  }

  if (streamEvent.type === "canvas_op") {
    const canvasOpEvent = event as {
      type: "canvas_op";
      operation?: { type?: string };
    };
    return {
      type: "canvas_op",
      operationType: canvasOpEvent.operation?.type ?? "unknown",
    };
  }

  if (streamEvent.type === "error") {
    const errorEvent = event as { type: "error"; error?: unknown };
    return {
      type: "error",
      errorShape: summarizeUnknownValueShape(errorEvent.error),
    };
  }

  if (streamEvent.type === "complete") {
    return { type: "complete" };
  }

  return { type: streamEvent.type ?? "unknown" };
}

export function createBuildStreamDiagnostics(): BuildStreamDiagnostics {
  return {
    startedAt: performance.now(),
    builderEventCount: 0,
    mappedPayloadCount: 0,
    skippedBuilderEventCount: 0,
    emittedRuntimeEventCount: 0,
    emittedEphemeralEventCount: 0,
    emittedPersistedEventCount: 0,
    assistantDeltaChars: 0,
    assistantFinalChars: 0,
    builderEventTypes: {},
    payloadTypes: {},
    canvasOperationTypes: {},
  };
}

export function logBuildStreamSummary(params: {
  session: { id: string; agentCanvasId: string };
  teamId: string;
  turnId: string;
  outcome: "completed" | "failed";
  promptLength: number;
  conversationTurnCount: number;
  pendingToolCalls: number;
  errorMessage: string | undefined;
  metrics: BuildStreamDiagnostics;
}) {
  const durationMs = Math.round(performance.now() - params.metrics.startedAt);
  logger.info(
    {
      sessionId: params.session.id,
      canvasId: params.session.agentCanvasId,
      teamId: params.teamId,
      turnId: params.turnId,
      outcome: params.outcome,
      durationMs,
      promptChars: params.promptLength,
      conversationTurnCount: params.conversationTurnCount,
      pendingToolCalls: params.pendingToolCalls,
      streamErrorMessage: params.errorMessage,
      diagnostics: {
        builderEventCount: params.metrics.builderEventCount,
        mappedPayloadCount: params.metrics.mappedPayloadCount,
        skippedBuilderEventCount: params.metrics.skippedBuilderEventCount,
        emittedRuntimeEventCount: params.metrics.emittedRuntimeEventCount,
        emittedEphemeralEventCount: params.metrics.emittedEphemeralEventCount,
        emittedPersistedEventCount: params.metrics.emittedPersistedEventCount,
        assistantDeltaChars: params.metrics.assistantDeltaChars,
        assistantFinalChars: params.metrics.assistantFinalChars,
        builderEventTypes: params.metrics.builderEventTypes,
        payloadTypes: params.metrics.payloadTypes,
        canvasOperationTypes: params.metrics.canvasOperationTypes,
      },
    },
    "Canvas builder stream summary"
  );
}
