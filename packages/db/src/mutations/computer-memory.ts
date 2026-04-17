import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export function upsertAgentMemory(
  db: Database,
  data: {
    agentId: string;
    teamId: string;
    key: string;
    content: string;
    type?: string | null;
    metadata?: unknown;
  }
) {
  return db.computerAgentMemory.upsert({
    where: { agentId_key: { agentId: data.agentId, key: data.key } },
    update: {
      content: data.content,
      type: data.type ?? null,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    },
    create: {
      agentId: data.agentId,
      teamId: data.teamId,
      key: data.key,
      content: data.content,
      type: data.type ?? null,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function deleteAgentMemory(
  db: Database,
  agentId: string,
  teamId: string,
  key: string
) {
  return db.computerAgentMemory.deleteMany({
    where: { agentId, teamId, key },
  });
}
