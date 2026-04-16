import type {
  ComputerRunStatus,
  ComputerTriggerType,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export function createComputerRun(
  db: Database,
  data: {
    id?: string;
    agentId: string;
    teamId: string;
    triggeredBy?: ComputerTriggerType;
    triggeredByUser?: string;
    status?: ComputerRunStatus;
  }
) {
  return db.computerRun.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      agentId: data.agentId,
      teamId: data.teamId,
      triggeredBy: data.triggeredBy,
      triggeredByUser: data.triggeredByUser,
      status: data.status ?? "PENDING",
    },
  });
}

export async function claimComputerRun(
  db: Database,
  runId: string,
  agentId: string
): Promise<{ id: string } | null> {
  const results = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE "computer_run"
    SET "status" = 'RUNNING', "startedAt" = NOW()
    WHERE "_id" = ${runId}
      AND "status" = 'PENDING'
      AND NOT EXISTS (
        SELECT 1 FROM "computer_run"
        WHERE "agentId" = ${agentId} AND "status" = 'RUNNING'
      )
    RETURNING "_id" as "id"
  `;
  return results[0] ?? null;
}

export async function failStaleRunningRuns(
  db: Database,
  staleMinutes: number
): Promise<number> {
  const results = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE "computer_run"
    SET "status" = 'FAILED', "error" = 'stale_timeout', "completedAt" = NOW()
    WHERE "status" = 'RUNNING'
      AND "startedAt" < NOW() - INTERVAL '1 minute' * ${staleMinutes}
    RETURNING "_id" as "id"
  `;
  return results.length;
}

export function updateComputerRun(
  db: Database,
  id: string,
  data: {
    status?: ComputerRunStatus;
    proposedActions?: unknown;
    summary?: string | null;
    error?: string | null;
    toolCallCount?: number;
    llmCallCount?: number;
    tokenUsage?: unknown;
    startedAt?: Date;
    completedAt?: Date;
    workflowId?: string;
  }
) {
  return db.computerRun.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.proposedActions !== undefined
        ? { proposedActions: data.proposedActions as Prisma.InputJsonValue }
        : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.error !== undefined ? { error: data.error } : {}),
      ...(data.toolCallCount !== undefined
        ? { toolCallCount: data.toolCallCount }
        : {}),
      ...(data.llmCallCount !== undefined
        ? { llmCallCount: data.llmCallCount }
        : {}),
      ...(data.tokenUsage !== undefined
        ? { tokenUsage: data.tokenUsage as Prisma.InputJsonValue }
        : {}),
      ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
      ...(data.completedAt !== undefined
        ? { completedAt: data.completedAt }
        : {}),
      ...(data.workflowId !== undefined ? { workflowId: data.workflowId } : {}),
    },
  });
}

export async function approveComputerRun(
  db: Database,
  runId: string,
  approvedIndices?: number[]
) {
  const run = await db.computerRun.findFirst({
    where: { id: runId, status: "WAITING_APPROVAL" },
    select: { proposedActions: true },
  });

  if (!run) {
    return null;
  }

  const allActions = (run.proposedActions ?? []) as Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>;

  const approvedActions = approvedIndices
    ? approvedIndices
        .filter((i) => i >= 0 && i < allActions.length)
        .map((i) => allActions[i] as (typeof allActions)[number])
    : allActions;

  return db.computerRun.update({
    where: { id: runId },
    data: {
      proposedActions: approvedActions as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });
}

export function rejectComputerRun(db: Database, runId: string) {
  return db.computerRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      error: "rejected_by_user",
      completedAt: new Date(),
    },
  });
}

export function insertComputerRunSteps(
  db: Database,
  runId: string,
  steps: Array<{
    type: string;
    name: string;
    input: unknown;
    output: unknown;
    durationMs: number;
  }>
) {
  if (steps.length === 0) {
    return Promise.resolve();
  }

  return db.computerRunStep.createMany({
    data: steps.map((step, index) => ({
      runId,
      sequence: index,
      type: step.type as "TOOL_CALL",
      name: step.name,
      input: step.input as Prisma.InputJsonValue,
      output: step.output as Prisma.InputJsonValue,
      durationMs: step.durationMs,
    })),
  });
}
