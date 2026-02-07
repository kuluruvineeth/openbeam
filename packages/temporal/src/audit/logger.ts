import type { Database, Prisma } from "@openplane/db";
import type {
  AgentAuditEvent,
  WorkflowAuditEvent,
  WorkflowAuditLogger,
} from "./types";

export interface AuditLoggerDependencies {
  db: Database;
}

function buildAuditLogData(event: WorkflowAuditEvent | AgentAuditEvent): {
  timestamp: Date;
  workflowId: string;
  runId: string | undefined;
  teamId: string;
  userId: string | undefined;
  action: string;
  metadata: Prisma.InputJsonValue;
} {
  const base = {
    timestamp: new Date(event.timestamp),
    workflowId: event.workflowId,
    runId: event.runId,
    teamId: event.teamId,
    userId: event.userId,
    action: event.action,
  };

  if ("executionId" in event) {
    return {
      ...base,
      metadata: {
        ...(event.metadata ?? {}),
        executionId: event.executionId,
        stepId: event.stepId,
        nodeId: event.nodeId,
        actor: event.actor,
      } as Prisma.InputJsonValue,
    };
  }

  return {
    ...base,
    metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
  };
}

export function createAuditLogger(
  deps: AuditLoggerDependencies
): WorkflowAuditLogger {
  return {
    async log(event: WorkflowAuditEvent): Promise<void> {
      await deps.db.workflowAuditLog.create({
        data: buildAuditLogData(event),
      });
    },

    async logAgentEvent(event: AgentAuditEvent): Promise<void> {
      await deps.db.workflowAuditLog.create({
        data: buildAuditLogData(event),
      });
    },
  };
}

export async function logWorkflowEvent(
  db: Database,
  event: WorkflowAuditEvent | AgentAuditEvent
): Promise<void> {
  await db.workflowAuditLog.create({
    data: buildAuditLogData(event),
  });
}

export async function logAgentAuditEvent(
  db: Database,
  event: AgentAuditEvent
): Promise<void> {
  await db.workflowAuditLog.create({
    data: buildAuditLogData(event),
  });
}

export function logAgentAuditEventBatch(
  db: Database,
  events: AgentAuditEvent[]
): Promise<{ count: number }> {
  return db.workflowAuditLog.createMany({
    data: events.map(buildAuditLogData),
  });
}
