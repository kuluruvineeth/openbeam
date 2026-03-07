import {
  context,
  type Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { activityInfo } from "@temporalio/activity";
import type {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  Next,
} from "@temporalio/worker";

export interface OpenTelemetryConfig {
  serviceName: string;
  sampleRate?: number;
  enabled?: boolean;
}

const TRACER_NAME = "@openbeam/temporal";

export function createOpenTelemetryInterceptors(config: OpenTelemetryConfig): {
  activityInbound: ActivityInboundCallsInterceptor;
} {
  const { serviceName, sampleRate = 1.0, enabled = true } = config;

  if (!enabled) {
    return {
      activityInbound: {},
    };
  }

  const tracer = trace.getTracer(TRACER_NAME, "1.0.0");

  const activityInbound: ActivityInboundCallsInterceptor = {
    // biome-ignore lint/suspicious/useAwait: tracer.startActiveSpan uses callback pattern, outer async required for interface
    async execute(
      input: ActivityExecuteInput,
      next: Next<ActivityInboundCallsInterceptor, "execute">
    ): Promise<unknown> {
      const shouldSample = Math.random() < sampleRate;
      if (!shouldSample) {
        return next(input);
      }

      const info = activityInfo();
      const activityType = info.activityType;

      return tracer.startActiveSpan(
        `temporal.activity.${activityType}`,
        {
          kind: SpanKind.INTERNAL,
          attributes: {
            "service.name": serviceName,
            "temporal.activity.type": activityType,
            "temporal.activity.id": info.activityId,
            "temporal.workflow.id": info.workflowExecution.workflowId,
            "temporal.workflow.run_id": info.workflowExecution.runId,
            "temporal.workflow.type": info.workflowType,
            "temporal.task_queue": info.taskQueue,
            "temporal.namespace":
              input.headers?.["temporal-namespace"]?.toString() ?? "default",
            "temporal.activity.attempt": info.attempt,
            "temporal.activity.is_local": info.isLocal,
          },
        },
        async (span: Span) => {
          try {
            const result = await context.with(
              trace.setSpan(context.active(), span),
              () => next(input)
            );

            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : String(error),
            });

            if (error instanceof Error) {
              span.recordException(error);
            }

            throw error;
          } finally {
            span.end();
          }
        }
      );
    },
  };

  return {
    activityInbound,
  };
}

export function createWorkflowInterceptors(): {
  inbound: unknown;
  outbound: unknown;
} {
  return {
    inbound: {},
    outbound: {},
  };
}
