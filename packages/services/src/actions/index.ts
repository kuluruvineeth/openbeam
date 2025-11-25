/**
 * Actions Service
 * Business logic for MCP tools, actions, and workflows
 *
 * Uses @openplane/db for all database operations.
 */

import prisma, {
  completeActionExecution,
  createActionExecution,
  type ActionExecutionResult as DbActionExecutionResult,
  type ActionResult as DbActionResult,
  getAction as dbGetAction,
  getTeamActions,
  getUserActionExecutions,
  startActionExecution,
  updateActionUsage,
} from "@openplane/db";

// ============================================================================
// Types
// ============================================================================

export interface ActionSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  isAiEnabled: boolean;
  requiresConfirmation: boolean;
  usageCount: number;
  createdAt: string;
}

export interface ActionDetail extends ActionSummary {
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  executionType: string;
  executionConfig: Record<string, unknown>;
  requiredPermissions: string[];
  allowedRoles: string[];
  isDestructive: boolean;
  isDryRunnable: boolean;
  version: string;
}

export interface ActionExecutionResult {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  output?: unknown;
  outputSummary?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ListActionsOptions {
  category?: string;
  tag?: string;
  aiEnabledOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExecuteActionParams {
  input: Record<string, unknown>;
  dryRun?: boolean;
  confirmedBy?: string;
}

// ============================================================================
// Actions Service Functions
// ============================================================================

/**
 * List available actions for a team
 */
export async function listActions(
  teamId: string,
  options: ListActionsOptions = {}
): Promise<{ actions: ActionSummary[]; total: number }> {
  const { category, limit = 20, offset = 0 } = options;

  const result = await getTeamActions(prisma, teamId, {
    category: category as
      | "COMMUNICATION"
      | "DOCUMENT"
      | "TASK"
      | "DATA"
      | "INTEGRATION"
      | "SYSTEM"
      | "CUSTOM"
      | undefined,
    includeDisabled: false,
    limit,
    offset,
  });

  return {
    actions: result.actions.map(mapActionSummary),
    total: result.total,
  };
}

/**
 * Get action details
 */
export async function getAction(
  actionId: string,
  teamId: string
): Promise<ActionDetail | null> {
  const action = await dbGetAction(prisma, actionId);

  if (!action || action.teamId !== teamId) {
    return null;
  }

  return mapActionDetail(action);
}

/**
 * Execute an action
 */
export async function executeAction(
  actionId: string,
  teamId: string,
  userId: string,
  params: ExecuteActionParams
): Promise<ActionExecutionResult> {
  // Get action details
  const action = await dbGetAction(prisma, actionId);

  if (!action || action.teamId !== teamId) {
    throw new Error("Action not found");
  }

  // Create execution record
  const executionId = await createActionExecution(prisma, {
    actionId,
    teamId,
    userId,
    input: params.input,
    status: params.dryRun ? "COMPLETED" : "PENDING",
  });

  const now = new Date();

  // If dry run, return immediately
  if (params.dryRun) {
    return {
      id: executionId,
      status: "completed",
      output: { dryRun: true, wouldExecute: params.input },
      outputSummary: "Dry run completed successfully",
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
    };
  }

  // If confirmation required and not confirmed, return pending
  if (action.confirmationRequired && !params.confirmedBy) {
    return {
      id: executionId,
      status: "pending",
      outputSummary: "Awaiting confirmation",
      createdAt: now.toISOString(),
    };
  }

  // Start execution
  await startActionExecution(prisma, executionId);

  // TODO: Actually execute the action based on executionType
  // For now, mark as completed with placeholder
  await completeActionExecution(prisma, executionId, {
    output: { executed: true },
    outputSummary: "Action executed successfully",
  });

  // Update action usage count
  await updateActionUsage(prisma, actionId);

  return {
    id: executionId,
    status: "completed",
    output: { executed: true },
    outputSummary: "Action executed successfully",
    durationMs: 100,
    createdAt: now.toISOString(),
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get execution history for an action
 */
export async function getExecutionHistory(
  actionId: string,
  teamId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ executions: ActionExecutionResult[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Get all executions for this action in the team
  // Note: getUserActionExecutions is user-scoped, so we need to get team-wide
  // For now, we'll use it with a workaround - in production you'd add a team-level query
  const result = await getUserActionExecutions(prisma, teamId, "", {
    actionId,
    limit,
    offset,
  });

  return {
    executions: result.executions.map(mapExecutionResult),
    total: result.total,
  };
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapActionSummary(action: DbActionResult): ActionSummary {
  return {
    id: action.id,
    name: action.name,
    slug: action.name.toLowerCase().replace(/\s+/g, "-"),
    description: action.description || undefined,
    category: action.category,
    tags: [], // Not in DbActionResult - would need to extend
    isAiEnabled: true, // Default - would need to extend schema
    requiresConfirmation: action.confirmationRequired,
    usageCount: action.usageCount,
    createdAt: new Date().toISOString(), // Not in result - would need to extend
  };
}

function mapActionDetail(action: DbActionResult): ActionDetail {
  return {
    ...mapActionSummary(action),
    inputSchema: action.inputSchema,
    outputSchema: action.outputSchema || undefined,
    executionType: action.executionType,
    executionConfig: action.executionConfig,
    requiredPermissions: [], // Not in result - would need to extend
    allowedRoles: [], // Not in result - would need to extend
    isDestructive: action.isDestructive,
    isDryRunnable: true, // Default - would need to extend
    version: "1.0.0", // Default - would need to extend
  };
}

function mapExecutionResult(
  execution: DbActionExecutionResult
): ActionExecutionResult {
  return {
    id: execution.id,
    status: execution.status.toLowerCase() as ActionExecutionResult["status"],
    output: execution.output || undefined,
    outputSummary: execution.outputSummary || undefined,
    errorMessage: execution.errorMessage || undefined,
    durationMs: execution.durationMs || undefined,
    createdAt: execution.createdAt.toISOString(),
    completedAt: execution.completedAt?.toISOString(),
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type { ActionDetail, ActionExecutionResult, ActionSummary };
