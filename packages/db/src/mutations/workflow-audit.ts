import type { Prisma, WorkflowAuditLog } from "../../prisma/generated/client";
import type { Database } from "../index";

export type WorkflowAuditAction =
  | "started"
  | "completed"
  | "failed"
  | "paused"
  | "resumed"
  | "cancelled"
  | "signaled"
  | "checkpoint"
  | "rate_limited"
  | "signal_dropped";

export type AgentAuditAction =
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "execution_cancelled"
  | "node_started"
  | "node_completed"
  | "node_failed"
  | "tool_called"
  | "tool_completed"
  | "tool_failed"
  | "approval_requested"
  | "approval_granted"
  | "approval_rejected"
  | "approval_expired"
  | "input_requested"
  | "input_received"
  | "external_mutation"
  | "policy_checked"
  | "policy_violated"
  | "budget_warning"
  | "budget_exceeded";

export interface CreateWorkflowAuditLogInput {
  timestamp?: Date;
  workflowId: string;
  runId?: string;
  teamId: string;
  userId?: string;
  action: WorkflowAuditAction | AgentAuditAction;
  metadata?: Prisma.InputJsonValue;
}

export const createWorkflowAuditLog = (
  db: Database,
  data: CreateWorkflowAuditLogInput
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: data.timestamp ?? new Date(),
      workflowId: data.workflowId,
      runId: data.runId,
      teamId: data.teamId,
      userId: data.userId,
      action: data.action,
      metadata: data.metadata ?? {},
    },
  });

export const createWorkflowAuditLogs = (
  db: Database,
  data: CreateWorkflowAuditLogInput[]
): Promise<{ count: number }> =>
  db.workflowAuditLog.createMany({
    data: data.map((d) => ({
      timestamp: d.timestamp ?? new Date(),
      workflowId: d.workflowId,
      runId: d.runId,
      teamId: d.teamId,
      userId: d.userId,
      action: d.action,
      metadata: d.metadata ?? {},
    })),
  });

export const createExecutionLifecycleLog = (
  db: Database,
  params: {
    workflowId: string;
    teamId: string;
    executionId: string;
    action:
      | "execution_started"
      | "execution_completed"
      | "execution_failed"
      | "execution_cancelled";
    triggeredBy: string;
    canvasId?: string;
    durationMs?: number;
    errorMessage?: string;
  }
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: new Date(),
      workflowId: params.workflowId,
      teamId: params.teamId,
      userId: params.triggeredBy.startsWith("user:")
        ? params.triggeredBy.slice(5)
        : undefined,
      action: params.action,
      metadata: {
        executionId: params.executionId,
        actor: params.triggeredBy,
        canvasId: params.canvasId,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
      },
    },
  });

export const createToolCallLog = (
  db: Database,
  params: {
    workflowId: string;
    teamId: string;
    executionId: string;
    stepId: string;
    nodeId?: string;
    toolName: string;
    action: "tool_called" | "tool_completed" | "tool_failed";
    durationMs?: number;
    errorMessage?: string;
  }
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: new Date(),
      workflowId: params.workflowId,
      teamId: params.teamId,
      action: params.action,
      metadata: {
        executionId: params.executionId,
        stepId: params.stepId,
        nodeId: params.nodeId,
        toolName: params.toolName,
        actor: "system:temporal",
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
      },
    },
  });

export const createApprovalLog = (
  db: Database,
  params: {
    workflowId: string;
    teamId: string;
    executionId: string;
    nodeId: string;
    action:
      | "approval_requested"
      | "approval_granted"
      | "approval_rejected"
      | "approval_expired";
    respondedBy?: string;
    message?: string;
  }
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: new Date(),
      workflowId: params.workflowId,
      teamId: params.teamId,
      userId: params.respondedBy,
      action: params.action,
      metadata: {
        executionId: params.executionId,
        nodeId: params.nodeId,
        actor: params.respondedBy
          ? `user:${params.respondedBy}`
          : "system:temporal",
        message: params.message,
      },
    },
  });

export const createNodeExecutionLog = (
  db: Database,
  params: {
    workflowId: string;
    teamId: string;
    executionId: string;
    stepId: string;
    nodeId: string;
    nodeType: string;
    action: "node_started" | "node_completed" | "node_failed";
    durationMs?: number;
    errorMessage?: string;
  }
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: new Date(),
      workflowId: params.workflowId,
      teamId: params.teamId,
      action: params.action,
      metadata: {
        executionId: params.executionId,
        stepId: params.stepId,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
        actor: "system:temporal",
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
      },
    },
  });

export const createPolicyLog = (
  db: Database,
  params: {
    workflowId: string;
    teamId: string;
    executionId: string;
    action:
      | "policy_checked"
      | "policy_violated"
      | "budget_warning"
      | "budget_exceeded";
    violations?: Array<{ rule: string; current: number; limit: number }>;
    currentUsage?: Record<string, number>;
  }
): Promise<WorkflowAuditLog> =>
  db.workflowAuditLog.create({
    data: {
      timestamp: new Date(),
      workflowId: params.workflowId,
      teamId: params.teamId,
      action: params.action,
      metadata: {
        executionId: params.executionId,
        actor: "system:temporal",
        violations: params.violations,
        currentUsage: params.currentUsage,
      },
    },
  });

export const deleteOldWorkflowAuditLogs = (
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<{ count: number }> =>
  db.workflowAuditLog.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });

export const deleteWorkflowAuditLogsByWorkflow = (
  db: Database,
  workflowId: string
): Promise<{ count: number }> =>
  db.workflowAuditLog.deleteMany({
    where: { workflowId },
  });
