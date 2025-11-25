/**
 * Agent Processor
 *
 * Processes agentic AI tasks including deep research and multi-step reasoning.
 * Supports the AgentExecution and AgentStep models from ai.prisma.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 */
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

// === Agent Step Handlers ===

type StepHandler = (
  step: AgentJobData["plan"][0],
  context: AgentJobData["context"]
) => Promise<{
  output: unknown;
  summary: string;
}>;

const stepHandlers: Record<string, StepHandler> = {
  search: async (step, _context) => {
    // TODO: Implement search step
    logger.info({ step }, "Executing search step");
    return {
      output: { results: [] },
      summary: `Searched for: ${step.description}`,
    };
  },

  read: async (step, _context) => {
    // TODO: Implement read step
    logger.info({ step }, "Executing read step");
    return {
      output: { content: "" },
      summary: `Read document: ${step.description}`,
    };
  },

  reason: async (step, context) => {
    // TODO: Implement reasoning step with LLM
    logger.info({ step, context }, "Executing reason step");
    return {
      output: { reasoning: "" },
      summary: `Reasoned about: ${step.description}`,
    };
  },

  tool: async (step, _context) => {
    // TODO: Implement tool execution
    logger.info({ step }, "Executing tool step");
    return {
      output: { result: null },
      summary: `Executed tool: ${step.toolName || step.description}`,
    };
  },

  synthesize: async (step, context) => {
    // TODO: Implement synthesis step
    logger.info({ step, context }, "Executing synthesize step");
    return {
      output: { synthesis: "" },
      summary: `Synthesized: ${step.description}`,
    };
  },

  verify: async (step, _context) => {
    // TODO: Implement verification step
    logger.info({ step }, "Executing verify step");
    return {
      output: { verified: true },
      summary: `Verified: ${step.description}`,
    };
  },

  ask: async (step, _context) => {
    // This step requires user interaction - pause execution
    logger.info({ step }, "Executing ask step - awaiting user input");
    return {
      output: { awaitingInput: true },
      summary: `Asked user: ${step.description}`,
    };
  },
};

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
      let plan = job.data.plan;
      if (!plan || plan.length === 0) {
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
        const step = plan[i]!;

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
   * Generate execution plan for a task
   */
  private async generatePlan(
    task: string,
    taskType: string
  ): Promise<AgentJobData["plan"]> {
    // TODO: Use LLM to generate plan based on task
    // For now, return a simple default plan
    logger.info({ task, taskType }, "Generating execution plan");

    const defaultPlan: AgentJobData["plan"] = [
      {
        stepId: "step-1",
        type: "search",
        description: `Search for information about: ${task}`,
      },
      {
        stepId: "step-2",
        type: "reason",
        description: "Analyze search results",
        dependencies: ["step-1"],
      },
      {
        stepId: "step-3",
        type: "synthesize",
        description: "Synthesize findings into answer",
        dependencies: ["step-2"],
      },
    ];

    return defaultPlan;
  }

  /**
   * Synthesize final result from step outputs
   */
  private async synthesizeResult(
    stepResults: Array<{ output: unknown; summary: string }>,
    _context: AgentJobData["context"]
  ): Promise<string> {
    // TODO: Use LLM to synthesize final result
    const summaries = stepResults.map((r) => r.summary).join("\n");
    return `Research completed:\n${summaries}`;
  }
}
