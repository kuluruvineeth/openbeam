/**
 * Agent Executor
 *
 * Executes agent steps and manages the execution flow.
 * These handlers are designed to be used by the worker's agent-processor.
 *
 * Uses database-backed memory and AI SDK v6 Agent class for modern agent execution.
 */

import { completionService } from "../completion";
import { prompts } from "../prompts";
import { ragPipeline } from "../rag";
import { toolRegistry } from "../tools";
import type {
  AgentContext,
  AgentStep,
  AgentStepResult,
  StepHandler,
  StepHandlers,
} from "./types";

/**
 * Search step handler
 * Uses RAG pipeline with Vespa for document retrieval
 */
const searchHandler: StepHandler = async (step, context) => {
  const query = (step.input?.query as string) || step.description;

  // Use RAG retriever for search (Vespa-backed)
  const result = await ragPipeline.answer(query, context.teamId, {
    accessControl: context.accessControl,
    retrieval: { topK: 5 },
    maxTokens: 500, // Brief answer for search step
  });

  // Persist search results to context if executionId exists
  if (context.executionId) {
    // Results are already persisted via AgentStep in worker
  }

  return {
    output: {
      documents: result.documents.map((d) => ({
        id: d.id,
        title: d.title,
        snippet: d.content.slice(0, 300),
        relevance: d.relevanceScore,
      })),
      answer: result.answer,
      totalMatches: result.documents.length,
    },
    summary: `Found ${result.documents.length} relevant documents for: "${query.slice(0, 50)}..."`,
    tokensUsed: result.usage.totalTokens,
  };
};

/**
 * Read step handler
 */
const readHandler: StepHandler = async (step, context) => {
  const documentId = step.input?.documentId as string;
  const content = (step.input?.content as string) || "";
  const focus = (step.input?.focus as string) || step.description;

  let textToAnalyze = content;

  // If documentId provided, fetch the document
  if (documentId && !content) {
    const result = await toolRegistry.execute(
      "get_document",
      { documentId },
      {
        teamId: context.teamId,
        userId: context.userId,
        accessControl: context.accessControl,
      }
    );

    if (result.success && result.result) {
      const doc = (result.result as { document?: { content?: string } })
        .document;
      textToAnalyze = doc?.content || "";
    }
  }

  // Analyze the content with LLM
  const messages = [
    {
      role: "user" as const,
      content: `Analyze the following content with focus on: ${focus}\n\nContent:\n${textToAnalyze.slice(0, 4000)}`,
    },
  ];

  const result = await completionService.complete(messages, {
    systemPrompt:
      "You are analyzing a document. Extract key information, facts, and insights relevant to the focus area.",
    maxTokens: 500,
  });

  return {
    output: {
      analysis: result.content,
      sourceLength: textToAnalyze.length,
    },
    summary: `Analyzed ${textToAnalyze.length} characters with focus on: ${focus.slice(0, 50)}`,
    tokensUsed: result.usage.totalTokens,
  };
};

/**
 * Reason step handler
 */
const reasonHandler: StepHandler = async (step, context) => {
  // Build context from previous outputs
  const previousOutputs = JSON.stringify(context.toolOutputs || {}, null, 2);

  const promptBuilder = prompts.agentReason(
    (step.input?.stepNumber as number) || 0,
    step.description,
    previousOutputs,
    JSON.stringify(context.searchResults?.slice(0, 3) || [])
  );

  const messages = promptBuilder.build();

  const result = await completionService.complete(
    messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      temperature: 0.5,
      maxTokens: 1000,
    }
  );

  return {
    output: {
      reasoning: result.content,
    },
    summary:
      result.content.slice(0, 100) + (result.content.length > 100 ? "..." : ""),
    tokensUsed: result.usage.totalTokens,
  };
};

/**
 * Tool step handler
 */
const toolHandler: StepHandler = async (step, context) => {
  const toolName = step.toolName || step.toolId;

  if (!toolName) {
    return {
      output: { error: "No tool specified" },
      summary: "Tool execution failed: no tool specified",
      tokensUsed: 0,
    };
  }

  const result = await toolRegistry.execute(
    toolName,
    step.toolArguments || step.input || {},
    {
      teamId: context.teamId,
      userId: context.userId,
      accessControl: context.accessControl,
      conversationId: context.conversationId,
      executionId: context.executionId,
      abortSignal: context.abortSignal,
    }
  );

  return {
    output: result.result,
    summary: result.success
      ? `Executed tool "${toolName}" successfully`
      : `Tool "${toolName}" failed: ${result.error}`,
    tokensUsed: 0,
  };
};

/**
 * Synthesize step handler
 */
const synthesizeHandler: StepHandler = async (step, context) => {
  const task = (step.input?.task as string) || step.description;
  const findings = JSON.stringify(context.toolOutputs || {}, null, 2);

  const promptBuilder = prompts.agentSynthesize(task, findings);
  const messages = promptBuilder.build();

  const result = await completionService.complete(
    messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      temperature: 0.4,
      maxTokens: 1500,
    }
  );

  return {
    output: {
      synthesis: result.content,
    },
    summary: "Synthesized findings into comprehensive answer",
    tokensUsed: result.usage.totalTokens,
  };
};

/**
 * Verify step handler
 */
const verifyHandler: StepHandler = async (step, context) => {
  const claim = (step.input?.claim as string) || step.description;
  const evidence = JSON.stringify(context.toolOutputs || {}, null, 2);

  const messages = [
    {
      role: "user" as const,
      content: `Verify the following claim:\n\nClaim: ${claim}\n\nEvidence:\n${evidence.slice(0, 3000)}\n\nRespond with JSON: { "verified": true/false, "confidence": 0.0-1.0, "reasoning": "..." }`,
    },
  ];

  const result = await completionService.complete(messages, {
    temperature: 0,
    maxTokens: 500,
  });

  let verification = { verified: false, confidence: 0, reasoning: "" };
  try {
    const jsonMatch = result.content.match(JSON_PATTERN);
    if (jsonMatch) {
      verification = JSON.parse(jsonMatch[0]);
    }
  } catch {
    verification.reasoning = result.content;
  }

  return {
    output: verification,
    summary: verification.verified
      ? `Verified with ${Math.round(verification.confidence * 100)}% confidence`
      : `Could not verify: ${verification.reasoning.slice(0, 50)}`,
    tokensUsed: result.usage.totalTokens,
  };
};

/**
 * Ask step handler (returns prompt for user)
 */
const askHandler: StepHandler = async (step, _context) => ({
  output: {
    awaitingInput: true,
    question: step.description,
    options: step.input?.options,
  },
  summary: `Asking user: ${step.description.slice(0, 50)}`,
  tokensUsed: 0,
});

/**
 * All step handlers
 */
export const agentStepHandlers: StepHandlers = {
  search: searchHandler,
  read: readHandler,
  reason: reasonHandler,
  tool: toolHandler,
  synthesize: synthesizeHandler,
  verify: verifyHandler,
  ask: askHandler,
};

/**
 * Execute a single step
 */
export async function executeStep(
  step: AgentStep,
  context: AgentContext
): Promise<AgentStepResult> {
  const startTime = Date.now();

  try {
    const handler = agentStepHandlers[step.type];

    if (!handler) {
      throw new Error(`Unknown step type: ${step.type}`);
    }

    const result = await handler(step, context);

    return {
      stepId: step.stepId,
      type: step.type,
      status: "completed",
      output: result.output,
      summary: result.summary,
      tokensUsed: result.tokensUsed || 0,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      stepId: step.stepId,
      type: step.type,
      status: "failed",
      output: null,
      summary: `Step failed: ${error instanceof Error ? error.message : String(error)}`,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute multiple steps in sequence
 */
export async function executeSteps(
  steps: AgentStep[],
  context: AgentContext,
  onStepComplete?: (result: AgentStepResult) => void
): Promise<AgentStepResult[]> {
  const results: AgentStepResult[] = [];
  let currentContext = { ...context };

  for (const step of steps) {
    // Check abort signal
    if (currentContext.abortSignal?.aborted) {
      results.push({
        stepId: step.stepId,
        type: step.type,
        status: "skipped",
        output: null,
        summary: "Execution aborted",
        tokensUsed: 0,
        durationMs: 0,
      });
      continue;
    }

    const result = await executeStep(step, currentContext);
    results.push(result);

    // Update context with step output
    if (result.status === "completed") {
      currentContext = {
        ...currentContext,
        toolOutputs: {
          ...currentContext.toolOutputs,
          [step.stepId]: result.output,
        },
      };
    }

    // Callback
    if (onStepComplete) {
      onStepComplete(result);
    }

    // Stop if step failed
    if (result.status === "failed") {
      break;
    }

    // Stop if awaiting user input
    if (
      step.type === "ask" &&
      (result.output as { awaitingInput?: boolean })?.awaitingInput
    ) {
      break;
    }
  }

  return results;
}

export default agentStepHandlers;
