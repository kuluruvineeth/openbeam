/**
 * Agent Types
 *
 * Type definitions for the agent execution system.
 */

/**
 * Agent task types
 */
export type AgentTaskType =
  | "research" // Deep research - multi-step information gathering
  | "analysis" // Data analysis - processing and insights
  | "action" // Action execution - triggering workflows
  | "synthesis"; // Synthesis - combining information from multiple sources

/**
 * Agent step types
 */
export type AgentStepType =
  | "search" // Search for information
  | "read" // Read/analyze document
  | "reason" // Think/reason about information
  | "tool" // Execute a tool/action
  | "synthesize" // Combine information
  | "verify" // Verify/validate result
  | "ask"; // Ask user for clarification

/**
 * Agent step definition
 */
export interface AgentStep {
  stepId: string;
  type: AgentStepType;
  description: string;
  input?: Record<string, unknown>;
  toolId?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  dependencies?: string[]; // Step IDs this step depends on
}

/**
 * Agent execution context
 */
export interface AgentContext {
  teamId: string;
  userId: string;
  conversationId?: string;
  executionId?: string;
  accessControl?: string[];

  // Accumulated knowledge from previous steps
  searchResults?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    relevance: number;
  }>;

  // Extracted facts
  facts?: string[];

  // Intermediate reasoning
  reasoning?: string[];

  // Tool outputs
  toolOutputs?: Record<string, unknown>;

  // User preferences (for personalization)
  userPreferences?: Record<string, unknown>;

  // Abort signal
  abortSignal?: AbortSignal;
}

/**
 * Agent step result
 */
export interface AgentStepResult {
  stepId: string;
  type: AgentStepType;
  status: "completed" | "failed" | "skipped";
  output: unknown;
  summary: string;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

/**
 * Agent plan
 */
export interface AgentPlan {
  analysis: string;
  steps: AgentStep[];
  estimatedTokens: number;
  estimatedDurationMs: number;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  executionId: string;
  status: "completed" | "failed" | "cancelled" | "timeout";
  result?: string;
  artifacts?: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  stepResults: AgentStepResult[];
  totalSteps: number;
  totalTokens: number;
  durationMs: number;
  error?: string;
}

/**
 * Step handler function type
 */
export type StepHandler = (
  step: AgentStep,
  context: AgentContext
) => Promise<{
  output: unknown;
  summary: string;
  tokensUsed?: number;
}>;

/**
 * Step handlers registry type
 */
export type StepHandlers = Record<AgentStepType, StepHandler>;

/**
 * Agent configuration
 */
export interface AgentConfig {
  // Execution limits
  maxSteps: number;
  maxTokensPerStep: number;
  maxTotalTokens: number;
  timeoutMs: number;

  // Model settings
  model?: string;
  temperature?: number;

  // Tool settings
  maxToolCalls: number;
  enableParallelTools: boolean;

  // Feature flags
  enableReranking: boolean;
  enableVerification: boolean;
}

/**
 * Memory entry for conversation
 */
export interface MemoryEntry {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agent memory interface (database-backed)
 */
export interface IAgentMemory {
  /** Add an entry to memory (persists to database) */
  add(entry: MemoryEntry): Promise<void>;

  /** Get recent entries (from database) */
  getRecent(count: number): Promise<MemoryEntry[]>;

  /** Get all entries (from database) */
  getAll(): Promise<MemoryEntry[]>;

  /** Clear memory (archives conversation) */
  clear(): Promise<void>;

  /** Get summary of memory */
  getSummary(): Promise<string>;

  /** Get token count of memory */
  getTokenCount(): Promise<number>;

  /** Trim memory to fit token limit (read-time filter) */
  trimToTokens(maxTokens: number): Promise<void>;

  /** Format memory as messages for LLM */
  toMessages(): Promise<
    Array<{ role: "user" | "assistant" | "system"; content: string }>
  >;

  /** Format memory as context string */
  toContext(): Promise<string>;

  /** Get the last user message */
  getLastUserMessage(): Promise<MemoryEntry | undefined>;

  /** Get the last assistant message */
  getLastAssistantMessage(): Promise<MemoryEntry | undefined>;

  /** Search memory for relevant entries */
  search(query: string, limit?: number): Promise<MemoryEntry[]>;

  /** Get entry count */
  getEntryCount(): Promise<number>;
}
