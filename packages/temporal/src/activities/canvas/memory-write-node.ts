import type { Database } from "@openplane/db";

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
    // biome-ignore lint/suspicious/noExplicitAny: Prisma delegate access for dynamic model
    const db = deps.db as any;
    const missionId = input.missionId ?? input.executionId;

    await db.missionMemory.upsert({
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
        // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON value
        value: input.value as any,
      },
      update: {
        // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON value
        value: input.value as any,
      },
    });

    return { key: input.key, scope: input.scope, written: true };
  };
}
