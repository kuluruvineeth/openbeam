import { context, propagation, trace } from "@opentelemetry/api";

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export function extractTraceContext(): TraceContext | undefined {
  const span = trace.getActiveSpan();

  if (!span) {
    return;
  }

  const spanContext = span.spanContext();

  if (!(spanContext.traceId && spanContext.spanId)) {
    return;
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
    traceState: spanContext.traceState?.serialize(),
  };
}

export function injectTraceContext(
  traceContext: TraceContext | undefined
): ReturnType<typeof context.active> {
  if (!traceContext) {
    return context.active();
  }

  const carrier: Record<string, string> = {};
  const traceParent = `00-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, "0")}`;
  carrier.traceparent = traceParent;

  if (traceContext.traceState) {
    carrier.tracestate = traceContext.traceState;
  }

  return propagation.extract(context.active(), carrier);
}

export function createLinkedSpan(
  tracerName: string,
  spanName: string,
  traceContext: TraceContext | undefined,
  attributes?: Record<string, string | number | boolean>
) {
  const tracer = trace.getTracer(tracerName);
  const parentContext = injectTraceContext(traceContext);

  return tracer.startSpan(
    spanName,
    {
      attributes,
    },
    parentContext
  );
}
