import type { Database } from "../index";

export function getComputerRuns(
  db: Database,
  agentId: string,
  teamId: string,
  limit = 20
) {
  return db.computerRun.findMany({
    where: { agentId, teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      summary: true,
      error: true,
      toolCallCount: true,
      llmCallCount: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });
}

export function getComputerRunWithSteps(
  db: Database,
  runId: string,
  agentId: string,
  teamId: string
) {
  return db.computerRun.findFirst({
    where: { id: runId, agentId, teamId },
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
}

export function getActiveRunForAgent(db: Database, agentId: string) {
  return db.computerRun.findFirst({
    where: { agentId, status: "RUNNING" },
    select: { id: true },
  });
}

export function getComputerRunProposals(
  db: Database,
  runId: string,
  agentId: string,
  teamId: string
) {
  return db.computerRun.findFirst({
    where: { id: runId, agentId, teamId, status: "WAITING_APPROVAL" },
    select: {
      id: true,
      status: true,
      proposedActions: true,
      agentId: true,
    },
  });
}
