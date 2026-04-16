import type { Database } from "../index";

export function getAgentMemory(
  db: Database,
  agentId: string,
  teamId: string,
  filters?: { key?: string; type?: string }
) {
  return db.computerAgentMemory.findMany({
    where: {
      agentId,
      teamId,
      ...(filters?.key ? { key: filters.key } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getAgentMemoryEntries(
  db: Database,
  agentId: string,
  teamId: string
) {
  return db.computerAgentMemory.findMany({
    where: { agentId, teamId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      key: true,
      content: true,
      type: true,
      metadata: true,
      updatedAt: true,
    },
  });
}
