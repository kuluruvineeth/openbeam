/**
 * Action Processor
 *
 * Processes MCP action/tool execution for "Glean Actions" functionality.
 * Supports the Action and ActionExecution models from actions.prisma.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 */
import prisma, {
  completeActionExecution,
  failActionExecution,
  setAwaitingConfirmation,
  startActionExecution,
  updateActionUsage,
} from "@openplane/db";
import {
  type ActionJobData,
  type ActionJobResult,
  createLinkedSpan,
  getConnectorCircuit,
  sendActionConfirmationRequest,
} from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { workerConfig } from "../config";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

// === Action Executor Types ===

type ActionExecutor = (
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  context: { teamId: string; userId: string; dryRun?: boolean }
) => Promise<{
  output: Record<string, unknown>;
  summary: string;
  rollbackData?: Record<string, unknown>;
}>;

// === Action Executors ===

const actionExecutors: Record<string, ActionExecutor> = {
  // API action executor
  api: async (input, config, context) => {
    const { endpoint, method = "POST", bodyTemplate } = config;

    // Replace template variables in body
    let body = bodyTemplate;
    if (typeof bodyTemplate === "string") {
      body = bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        String(input[key] ?? "")
      );
    }

    if (context.dryRun) {
      return {
        output: { dryRun: true, wouldCall: { endpoint, method, body } },
        summary: `[DRY RUN] Would call ${method} ${endpoint}`,
      };
    }

    // TODO: Make actual API call
    logger.info({ endpoint, method, input }, "Executing API action");

    return {
      output: { success: true },
      summary: `Called ${method} ${endpoint}`,
    };
  },

  // Webhook action executor
  webhook: async (input, config, context) => {
    const { url, method = "POST" } = config;

    if (context.dryRun) {
      return {
        output: { dryRun: true, wouldCall: { url, method } },
        summary: `[DRY RUN] Would call webhook ${url}`,
      };
    }

    // TODO: Make actual webhook call
    logger.info({ url, method, input }, "Executing webhook action");

    return {
      output: { success: true },
      summary: `Called webhook ${url}`,
    };
  },

  // Function action executor (internal functions)
  function: async (input, config, context) => {
    const { handler, module } = config;

    if (context.dryRun) {
      return {
        output: { dryRun: true, wouldCall: { handler, module } },
        summary: `[DRY RUN] Would execute function ${module}.${handler}`,
      };
    }

    // TODO: Execute internal function
    logger.info({ handler, module, input }, "Executing function action");

    return {
      output: { success: true },
      summary: `Executed function ${module}.${handler}`,
    };
  },

  // MCP action executor
  mcp: async (input, config, context) => {
    const { server, tool } = config;

    if (context.dryRun) {
      return {
        output: { dryRun: true, wouldCall: { server, tool } },
        summary: `[DRY RUN] Would call MCP tool ${server}/${tool}`,
      };
    }

    // TODO: Execute MCP tool call
    logger.info({ server, tool, input }, "Executing MCP action");

    return {
      output: { success: true },
      summary: `Called MCP tool ${server}/${tool}`,
    };
  },
};

// === Action Processor ===

export class ActionProcessor extends BaseProcessor<ActionJobData> {
  constructor() {
    super("action", {
      concurrency: workerConfig.action.concurrency,
      limiter: workerConfig.action.rateLimit,
    });
  }

  protected async processJob(
    job: Job<ActionJobData>
  ): Promise<ActionJobResult> {
    const {
      executionId,
      actionId,
      teamId,
      userId,
      input,
      confirmationRequired,
      confirmed,
      actionMeta,
      dryRun,
      traceContext,
    } = job.data;

    const span = createLinkedSpan(
      "openplane-worker",
      "action-processor.process",
      traceContext,
      {
        "job.id": job.id || "",
        "execution.id": executionId,
        "action.id": actionId,
        "action.category": actionMeta.category,
      }
    );

    const startTime = Date.now();

    try {
      logger.info(
        { jobId: job.id, executionId, actionId, category: actionMeta.category },
        "Processing action job"
      );

      // Check if confirmation is required but not yet provided
      if (confirmationRequired && !confirmed) {
        // Send confirmation request notification
        await sendActionConfirmationRequest({
          teamId,
          userId,
          executionId,
          actionName: actionMeta.name,
          actionDescription: `Execute ${actionMeta.name}`,
          isDestructive: actionMeta.isDestructive,
        });

        // Update execution status using @db mutation
        await setAwaitingConfirmation(prisma, executionId);

        logger.info(
          { executionId, actionId },
          "Action awaiting user confirmation"
        );

        return {
          executionId,
          status: "completed", // Job is done, waiting for confirmation job
          durationMs: Date.now() - startTime,
        };
      }

      // Update execution status to running using @db mutation
      await startActionExecution(prisma, executionId);

      // Validate input against schema
      const validationResult = await this.validateInput(
        input,
        actionMeta.executionConfig
      );
      if (!validationResult.valid) {
        throw new Error(`Input validation failed: ${validationResult.error}`);
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(actionId, actionMeta);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Get executor based on execution type
      const executor = actionExecutors[actionMeta.executionType];
      if (!executor) {
        throw new Error(`Unknown execution type: ${actionMeta.executionType}`);
      }

      // Execute action with circuit breaker
      const circuit = getConnectorCircuit(actionMeta.category);
      const result = await circuit.execute(
        async () =>
          await executor(input, actionMeta.executionConfig, {
            teamId,
            userId,
            dryRun,
          })
      );

      // Update execution as completed using @db mutation
      await completeActionExecution(prisma, executionId, {
        output: result.output,
        outputSummary: result.summary,
        isRollbackable: !!result.rollbackData,
        rollbackData: result.rollbackData,
      });

      // Update action usage stats using @db mutation
      await updateActionUsage(prisma, actionId);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        "action.dry_run": dryRun,
        "action.duration_ms": Date.now() - startTime,
      });

      logger.info(
        {
          jobId: job.id,
          executionId,
          actionId,
          durationMs: Date.now() - startTime,
          dryRun,
        },
        "Action job completed successfully"
      );

      return {
        executionId,
        status: "completed",
        output: result.output,
        outputSummary: result.summary,
        durationMs: Date.now() - startTime,
        isRollbackable: !!result.rollbackData,
        rollbackData: result.rollbackData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = this.categorizeError(error);

      // Update execution as failed using @db mutation
      await failActionExecution(prisma, executionId, {
        code: errorCode,
        message: errorMessage,
      });

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        { error: errorMessage, jobId: job.id, executionId, actionId },
        "Action job failed"
      );

      return {
        executionId,
        status: "failed",
        error: { code: errorCode, message: errorMessage },
        durationMs: Date.now() - startTime,
      };
    } finally {
      span.end();
    }
  }

  /**
   * Validate input against action schema
   */
  private async validateInput(
    input: Record<string, unknown>,
    _config: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    // TODO: Implement JSON schema validation
    if (!input || typeof input !== "object") {
      return { valid: false, error: "Input must be an object" };
    }
    return { valid: true };
  }

  /**
   * Check action rate limits
   */
  private async checkRateLimit(
    actionId: string,
    actionMeta: ActionJobData["actionMeta"]
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!actionMeta.rateLimit) {
      return { allowed: true };
    }

    // TODO: Implement rate limit checking
    return { allowed: true };
  }

  /**
   * Categorize error for better error handling
   */
  private categorizeError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("timeout")) return "TIMEOUT";
      if (message.includes("rate limit")) return "RATE_LIMITED";
      if (message.includes("unauthorized") || message.includes("401"))
        return "UNAUTHORIZED";
      if (message.includes("forbidden") || message.includes("403"))
        return "FORBIDDEN";
      if (message.includes("not found") || message.includes("404"))
        return "NOT_FOUND";
      if (message.includes("validation")) return "VALIDATION_ERROR";
      if (message.includes("circuit")) return "CIRCUIT_OPEN";
    }

    return "INTERNAL_ERROR";
  }
}
