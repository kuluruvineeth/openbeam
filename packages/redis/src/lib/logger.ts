import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("@openplane/redis");

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const redisLogger = {
  warn(message: string, context?: Record<string, unknown>): void {
    const span = tracer.startSpan("redis.warn");
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        span.setAttribute(key, String(value));
      }
    }
    span.end();
  },

  formatError,
};
