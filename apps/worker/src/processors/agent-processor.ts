/**
 * Agent Processor
 *
 * Processes agentic AI tasks including deep research and multi-step reasoning.
 * Supports the AgentExecution and AgentStep models from ai.prisma.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 * Uses @openplane/ai for step execution and planning.
 */

import {
  type AgentContext,
  type AgentStep,
  type AgentTaskType,
  agentPlanner,
  agentStepHandlers,
} from "@openplane/ai";
import prisma, {
  completeAgentExecution,
  completeAgentStep,
  createAgentStep,
  failAgentExecution,
  failAgentStep,
  type StepType,
  startAgentExecution,
  startAgentStep,
  updateAgentExecution,
} from "@openplane/db";
import {
  type AgentJobData,
  type AgentJobResult,
  createLinkedSpan,
  llmCircuit,
} from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { workerConfig } from "../config";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

// === Agent Step Handlers (from @openplane/ai) ===

type JobStep = NonNullable<AgentJobData["plan"]>[number];

type StepHandler = (
  step: JobStep,
  context: AgentJobData["context"]
) => Promise<{
  output: unknown;
  summary: string;
}>;

/**
 * Wrap AI step handlers to match worker interface
 */
function createStepHandlers(): Record<string, StepHandler> {
  const handlers: Record<string, StepHandler> = {};

  for (const [type, handler] of Object.entries(agentStepHandlers)) {
    handlers[type] = async (step, context) => {
      logger.info(
        { stepType: type, step: step.stepId },
        `Executing ${type} step`
      );

      // Convert to AI package format
      const aiStep: AgentStep = {
        stepId: step.stepId,
        type: type as AgentStep["type"],
        description: step.description,
        input: step.input as Record<string, unknown>,
        toolId: step.toolId,
        toolName: step.toolName,
        dependencies: step.dependencies,
      };

      const aiContext: AgentContext = {
        teamId: ((context as Record<string, unknown>)?.teamId as string) || "",
        userId: ((context as Record<string, unknown>)?.userId as string) || "",
        searchResults: context?.searchResults,
        facts: context?.facts,
        reasoning: context?.reasoning,
        toolOutputs: context?.toolOutputs,
        userPreferences: context?.userPreferences,
      };

      const handlerResult = await (
        handler as (
          step: AgentStep,
          ctx: AgentContext
        ) => Promise<{ output: unknown; summary: string }>
      )(aiStep, aiContext);

      return {
        output: handlerResult.output,
        summary: handlerResult.summary,
      };
    };
  }

  return handlers;
}

const stepHandlers = createStepHandlers();

// === Agent Processor ===

export class AgentProcessor extends BaseProcessor<AgentJobData> {
  constructor() {
    super("agent", {
      concurrency: workerConfig.agent.concurrency,
      limiter: workerConfig.agent.rateLimit,
    });
  }

  protected async processJob(job: Job<AgentJobData>): Promise<AgentJobResult> {
    const { executionId, task, taskType, traceContext } = job.data;

    const span = createLinkedSpan(
      "openplane-worker",
      "agent-processor.process",
      traceContext,
      {
        "job.id": job.id || "",
        "execution.id": executionId,
        "task.type": taskType,
      }
    );

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      logger.info(
        { jobId: job.id, executionId, taskType },
        "Processing agent job"
      );

      // Update execution status using @db mutation
      await startAgentExecution(prisma, executionId);

      // Generate plan if not provided
      let plan: JobStep[] = job.data.plan || [];
      if (plan.length === 0) {
        plan = await this.generatePlan(task, taskType);
        await updateAgentExecution(prisma, executionId, {
          plan: plan as unknown as Record<string, unknown>[],
          totalSteps: plan.length,
        });
      }

      // Execute steps
      let context = job.data.context || {};
      const stepResults: Array<{
        stepId: string;
        status: string;
        output: unknown;
        summary: string;
        tokensUsed: number;
        durationMs: number;
      }> = [];

      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        if (!step) {
          continue;
        }

        // Check timeout
        if (Date.now() - startTime > workerConfig.agent.timeout) {
          throw new Error("Agent execution timeout");
        }

        // Check token limit
        if (totalTokens >= workerConfig.agent.maxTotalTokens) {
          throw new Error("Agent token limit exceeded");
        }

        // Update current step
        await updateAgentExecution(prisma, executionId, { currentStep: i });

        // Create step record using @db mutation
        const stepRecordId = await createAgentStep(prisma, {
          executionId,
          stepNumber: i,
          type: step.type.toUpperCase() as StepType,
          description: step.description,
          input: step.input as Record<string, unknown>,
          toolId: step.toolId,
          toolName: step.toolName,
        });

        await startAgentStep(prisma, stepRecordId);

        const stepStartTime = Date.now();

        try {
          // Execute step with circuit breaker
          const handler = stepHandlers[step.type];
          if (!handler) {
            throw new Error(`Unknown step type: ${step.type}`);
          }

          const result = await llmCircuit.execute(
            async () => await handler(step, context)
          );

          // Record step completion
          const stepDuration = Date.now() - stepStartTime;
          const stepTokens = 100; // TODO: Get actual token count

          await completeAgentStep(
            prisma,
            stepRecordId,
            result.output as Record<string, unknown>,
            result.summary,
            stepTokens
          );

          stepResults.push({
            stepId: step.stepId,
            status: "completed",
            output: result.output,
            summary: result.summary,
            tokensUsed: stepTokens,
            durationMs: stepDuration,
          });

          totalTokens += stepTokens;

          // Update context with step output
          context = {
            ...context,
            toolOutputs: {
              ...context.toolOutputs,
              [step.stepId]: result.output,
            },
          };

          // Check if step requires user interaction
          if (
            step.type === "ask" &&
            (result.output as { awaitingInput?: boolean })?.awaitingInput
          ) {
            await updateAgentExecution(prisma, executionId, {
              status: "WAITING",
            });

            return {
              executionId,
              status: "completed", // Technically paused, but job is done
              totalSteps: i + 1,
              totalTokens,
              durationMs: Date.now() - startTime,
            };
          }
        } catch (stepError) {
          const errorMessage =
            stepError instanceof Error ? stepError.message : String(stepError);

          await failAgentStep(prisma, stepRecordId, errorMessage);
          throw stepError;
        }
      }

      // Generate final result
      const finalResult = await this.synthesizeResult(stepResults, context);

      // Update execution as completed using @db mutation
      await completeAgentExecution(
        prisma,
        executionId,
        finalResult,
        totalTokens
      );

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        "agent.total_steps": plan.length,
        "agent.total_tokens": totalTokens,
      });

      logger.info(
        {
          jobId: job.id,
          executionId,
          steps: plan.length,
          tokens: totalTokens,
          durationMs: Date.now() - startTime,
        },
        "Agent job completed successfully"
      );

      return {
        executionId,
        status: "completed",
        result: finalResult,
        totalSteps: plan.length,
        totalTokens,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await failAgentExecution(prisma, executionId, errorMessage);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        { error: errorMessage, jobId: job.id, executionId },
        "Agent job failed"
      );

      return {
        executionId,
        status: "failed",
        error: errorMessage,
        totalSteps: 0,
        totalTokens,
        durationMs: Date.now() - startTime,
      };
    } finally {
      span.end();
    }
  }

  /**
   * Generate execution plan for a task using @openplane/ai
   */
  private async generatePlan(
    task: string,
    taskType: string
  ): Promise<JobStep[]> {
    logger.info({ task, taskType }, "Generating execution plan using AI");

    try {
      // Use AI planner for intelligent plan generation
      const plan = await agentPlanner.generatePlan(
        task,
        taskType as AgentTaskType,
        {
          teamId: "",
          userId: "",
        }
      );

      logger.info(
        { steps: plan.steps.length, analysis: plan.analysis },
        "Plan generated"
      );

      // Convert to worker format
      return plan.steps.map((step: AgentStep) => ({
        stepId: step.stepId,
        type: step.type,
        description: step.description,
        input: step.input,
        toolId: step.toolId,
        toolName: step.toolName,
        dependencies: step.dependencies,
      }));
    } catch (error) {
      logger.warn(
        { error, task, taskType },
        "AI plan generation failed, using default plan"
      );

      // Fallback to default plan
      return agentPlanner
        .getDefaultPlan(task, taskType as AgentTaskType)
        .steps.map((step: AgentStep) => ({
          stepId: step.stepId,
          type: step.type,
          description: step.description,
          input: step.input,
          toolId: step.toolId,
          toolName: step.toolName,
          dependencies: step.dependencies,
        }));
    }
  }

  /**
   * Synthesize final result from step outputs
   */
  private synthesizeResult(
    stepResults: Array<{ output: unknown; summary: string }>,
    _context: AgentJobData["context"]
  ): string {
    // Build comprehensive summary from all steps
    const stepSummaries = stepResults
      .filter((r) => r.summary)
      .map((r, i) => `${i + 1}. ${r.summary}`)
      .join("\n");

    // Extract key findings from outputs
    const findings: string[] = [];
    for (const result of stepResults) {
      if (result.output) {
        const output = result.output as Record<string, unknown>;
        if (output.answer) {
          findings.push(String(output.answer));
        }
        if (output.synthesis) {
          findings.push(String(output.synthesis));
        }
        if (output.reasoning) {
          findings.push(String(output.reasoning));
        }
      }
    }

    if (findings.length > 0) {
      return findings.join("\n\n");
    }

    return `Research completed with ${stepResults.length} steps:\n\n${stepSummaries}`;
  }
}
