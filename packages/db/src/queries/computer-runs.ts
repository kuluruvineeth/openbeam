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

export async function getAgentRunStats(
  db: Database,
  teamId: string,
  since: Date
) {
  const agents = await db.computerAgent.findMany({
    where: { teamId },
    select: { id: true, name: true, slug: true },
  });

  const stats = await db.computerRun.groupBy({
    by: ["agentId"],
    where: { teamId, createdAt: { gte: since } },
    _count: { id: true },
    _sum: { toolCallCount: true, llmCallCount: true },
  });

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return stats.map((s) => {
    const agent = agentMap.get(s.agentId);
    return {
      agentId: s.agentId,
      agentName: agent?.name ?? "unknown",
      agentSlug: agent?.slug ?? "unknown",
      runCount: s._count.id,
      totalToolCalls: s._sum.toolCallCount ?? 0,
      totalLlmCalls: s._sum.llmCallCount ?? 0,
    };
  });
}
