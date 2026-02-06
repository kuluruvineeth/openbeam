import type { Database } from "../index";

export function getRecentCompletedExecutions(
  db: Database,
  canvasId: string,
  limit = 50
) {
  return db.agentCanvasExecution.findMany({
    where: {
      agentCanvasId: canvasId,
      status: "COMPLETED",
    },
    select: {
      latencyMs: true,
      tokenUsage: true,
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}

export function getExecutionWithSteps(
  db: Database,
  executionId: string,
  teamId: string
) {
  return db.agentCanvasExecution.findFirst({
    where: {
      id: executionId,
      agentCanvas: { teamId },
    },
    include: {
      steps: {
        orderBy: { createdAt: "asc" },
      },
      approvals: true,
    },
  });
}
