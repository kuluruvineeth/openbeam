import { activityInfo } from "@temporalio/activity";
import type {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  ActivityOutboundCallsInterceptor,
  Next,
} from "@temporalio/worker";
import { ApplicationFailure } from "@temporalio/workflow";

export interface ActivityInterceptorConfig {
  enableMetrics?: boolean;
  enableLogging?: boolean;
  logPayloads?: boolean;
  metricsPrefix?: string;
}

export interface ActivityMetrics {
  activityExecutions: Map<string, number>;
  activityDurations: Map<string, number[]>;
  activityErrors: Map<string, number>;
}

const globalMetrics: ActivityMetrics = {
  activityExecutions: new Map(),
  activityDurations: new Map(),
  activityErrors: new Map(),
};

export function getActivityMetrics(): ActivityMetrics {
  return globalMetrics;
}

export function createActivityInboundInterceptor(
  config: ActivityInterceptorConfig = {}
): ActivityInboundCallsInterceptor {
  const {
    enableMetrics = true,
    enableLogging = true,
    logPayloads = false,
  } = config;

  return {
    async execute(
      input: ActivityExecuteInput,
      next: Next<ActivityInboundCallsInterceptor, "execute">
    ): Promise<unknown> {
      const info = activityInfo();
      const activityType = info.activityType;
      const startTime = Date.now();

      if (enableMetrics) {
        const current = globalMetrics.activityExecutions.get(activityType) ?? 0;
        globalMetrics.activityExecutions.set(activityType, current + 1);
      }

      if (enableLogging) {
        const logData: Record<string, unknown> = {
          activity: activityType,
          attempt: input.headers?.["temporal-attempt"]?.toString() ?? "1",
        };

        if (logPayloads && input.args.length > 0) {
          logData.inputSize = JSON.stringify(input.args).length;
        }

        console.log(`[activity:start] ${activityType}`, logData);
      }

      try {
        const result = await next(input);
        const duration = Date.now() - startTime;

        if (enableMetrics) {
          const durations =
            globalMetrics.activityDurations.get(activityType) ?? [];
          durations.push(duration);
          if (durations.length > 1000) {
            durations.shift();
          }
          globalMetrics.activityDurations.set(activityType, durations);
        }

        if (enableLogging) {
          console.log(`[activity:complete] ${activityType}`, {
            duration: `${duration}ms`,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        if (enableMetrics) {
          const current = globalMetrics.activityErrors.get(activityType) ?? 0;
          globalMetrics.activityErrors.set(activityType, current + 1);
        }

        if (enableLogging) {
          console.error(`[activity:error] ${activityType}`, {
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        if (error instanceof ApplicationFailure) {
          throw error;
        }

        if (error instanceof Error) {
          throw ApplicationFailure.nonRetryable(
            error.message,
            "ActivityError",
            {
              originalError: error.name,
              stack: error.stack,
            }
          );
        }

        throw ApplicationFailure.nonRetryable(
          String(error),
          "UnknownActivityError"
        );
      }
    },
  };
}

export function createActivityOutboundInterceptor(
  _config: ActivityInterceptorConfig = {}
): ActivityOutboundCallsInterceptor {
  return {};
}
