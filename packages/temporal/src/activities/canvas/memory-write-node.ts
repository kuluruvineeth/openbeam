import type { Database } from "@openplane/db";
import type { Prisma } from "@prisma/client";

export interface MemoryWriteInput {
  executionId: string;
  teamId: string;
  missionId?: string;
  agentId?: string;
  key: string;
  value: unknown;
  scope: "workflow" | "agent" | "mission" | "team";
}

export interface MemoryWriteOutput {
  key: string;
  scope: string;
  written: boolean;
}

export interface MemoryWriteNodeDependencies {
  db: Database;
}

export function createMemoryWriteNodeActivity(
  deps: MemoryWriteNodeDependencies
) {
  return async function memoryWriteNode(
    input: MemoryWriteInput
  ): Promise<MemoryWriteOutput> {
    const missionId = input.missionId ?? input.executionId;

    await deps.db.missionMemory.upsert({
      where: {
        missionId_agentId_key_scope: {
          missionId,
          agentId: input.agentId ?? "",
          key: input.key,
          scope: input.scope,
        },
      },
      create: {
        missionId,
        agentId: input.agentId ?? "",
        key: input.key,
        scope: input.scope,
        value: input.value as Prisma.InputJsonValue,
      },
      update: {
        value: input.value as Prisma.InputJsonValue,
      },
    });

    return { key: input.key, scope: input.scope, written: true };
  };
}
