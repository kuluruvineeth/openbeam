import type { Database } from "../index";

export function getResearchSession(db: Database, id: string) {
  return db.researchSession.findUnique({
    where: { id },
    include: { evidence: true },
  });
}

export function getResearchSessionByWorkflow(db: Database, workflowId: string) {
  return db.researchSession.findUnique({
    where: { workflowId },
    include: { evidence: true },
  });
}

export function listResearchSessions(db: Database, teamId: string, limit = 20) {
  return db.researchSession.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      prompt: true,
      status: true,
      progress: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
