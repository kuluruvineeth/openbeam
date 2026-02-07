import {
  type ContinueAsNewInput,
  type Next,
  type QueryInput,
  type SignalInput,
  type UpdateInput,
  type WorkflowExecuteInput,
  type WorkflowInboundCallsInterceptor,
  type WorkflowOutboundCallsInterceptor,
  workflowInfo,
} from "@temporalio/workflow";

export interface WorkflowInterceptorConfig {
  enableMetrics?: boolean;
  enableLogging?: boolean;
  logPayloads?: boolean;
}

export interface WorkflowMetrics {
  workflowStarts: Map<string, number>;
  workflowCompletions: Map<string, number>;
  workflowErrors: Map<string, number>;
  signalsReceived: Map<string, number>;
  queriesReceived: Map<string, number>;
  continueAsNewCount: Map<string, number>;
}

const globalWorkflowMetrics: WorkflowMetrics = {
  workflowStarts: new Map(),
  workflowCompletions: new Map(),
  workflowErrors: new Map(),
  signalsReceived: new Map(),
  queriesReceived: new Map(),
  continueAsNewCount: new Map(),
};

export function getWorkflowMetrics(): WorkflowMetrics {
  return globalWorkflowMetrics;
}

export function createWorkflowInboundInterceptor(
  config: WorkflowInterceptorConfig = {}
): WorkflowInboundCallsInterceptor {
  const { enableMetrics = true, enableLogging = true } = config;

  return {
    async execute(
      input: WorkflowExecuteInput,
      next: Next<WorkflowInboundCallsInterceptor, "execute">
    ): Promise<unknown> {
      const info = workflowInfo();
      const workflowType = info.workflowType;

      if (enableMetrics) {
        const current =
          globalWorkflowMetrics.workflowStarts.get(workflowType) ?? 0;
        globalWorkflowMetrics.workflowStarts.set(workflowType, current + 1);
      }

      if (enableLogging) {
        console.log(`[workflow:start] ${workflowType}`);
      }

      try {
        const result = await next(input);

        if (enableMetrics) {
          const current =
            globalWorkflowMetrics.workflowCompletions.get(workflowType) ?? 0;
          globalWorkflowMetrics.workflowCompletions.set(
            workflowType,
            current + 1
          );
        }

        if (enableLogging) {
          console.log(`[workflow:complete] ${workflowType}`);
        }

        return result;
      } catch (error) {
        if (enableMetrics) {
          const current =
            globalWorkflowMetrics.workflowErrors.get(workflowType) ?? 0;
          globalWorkflowMetrics.workflowErrors.set(workflowType, current + 1);
        }

        if (enableLogging) {
          console.error(`[workflow:error] ${workflowType}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        throw error;
      }
    },

    handleSignal(
      input: SignalInput,
      next: Next<WorkflowInboundCallsInterceptor, "handleSignal">
    ): Promise<void> {
      if (enableMetrics) {
        const key = input.signalName;
        const current = globalWorkflowMetrics.signalsReceived.get(key) ?? 0;
        globalWorkflowMetrics.signalsReceived.set(key, current + 1);
      }

      if (enableLogging) {
        console.log(`[workflow:signal] ${input.signalName}`);
      }

      return next(input);
    },

    handleQuery(
      input: QueryInput,
      next: Next<WorkflowInboundCallsInterceptor, "handleQuery">
    ): Promise<unknown> {
      if (enableMetrics) {
        const key = input.queryName;
        const current = globalWorkflowMetrics.queriesReceived.get(key) ?? 0;
        globalWorkflowMetrics.queriesReceived.set(key, current + 1);
      }

      return next(input);
    },

    handleUpdate(
      input: UpdateInput,
      next: Next<WorkflowInboundCallsInterceptor, "handleUpdate">
    ): Promise<unknown> {
      if (enableLogging) {
        console.log(`[workflow:update] ${input.name}`);
      }

      return next(input);
    },
  };
}

export function createWorkflowOutboundInterceptor(
  config: WorkflowInterceptorConfig = {}
): WorkflowOutboundCallsInterceptor {
  const { enableMetrics = true, enableLogging = true } = config;

  return {
    continueAsNew(
      input: ContinueAsNewInput,
      next: Next<WorkflowOutboundCallsInterceptor, "continueAsNew">
    ): Promise<never> {
      const info = workflowInfo();
      const workflowType = info.workflowType;

      if (enableMetrics) {
        const current =
          globalWorkflowMetrics.continueAsNewCount.get(workflowType) ?? 0;
        globalWorkflowMetrics.continueAsNewCount.set(workflowType, current + 1);
      }

      if (enableLogging) {
        console.log(`[workflow:continueAsNew] ${workflowType}`);
      }

      return next(input);
    },
  };
}
