import type { Database } from "@openplane/db";

export interface MemoryReadInput {
  executionId: string;
  teamId: string;
  missionId?: string;
  agentId?: string;
  key: string;
  scope: "workflow" | "agent" | "mission" | "team";
  defaultValue?: unknown;
  throwOnMissing?: boolean;
}

export interface MemoryReadOutput {
  key: string;
  value: unknown;
  found: boolean;
}

export interface MemoryReadNodeDependencies {
  db: Database;
}

export function createMemoryReadNodeActivity(deps: MemoryReadNodeDependencies) {
  return async function memoryReadNode(
    input: MemoryReadInput
  ): Promise<MemoryReadOutput> {
    const missionId = input.missionId ?? input.executionId;

    const record = await deps.db.missionMemory.findUnique({
      where: {
        missionId_agentId_key_scope: {
          missionId,
          agentId: input.agentId ?? "",
          key: input.key,
          scope: input.scope,
        },
      },
    });

    if (!record && input.throwOnMissing) {
      throw new Error(
        `Memory key "${input.key}" not found in scope "${input.scope}"`
      );
    }

    return {
      key: input.key,
      value: record ? record.value : (input.defaultValue ?? null),
      found: !!record,
    };
  };
}
