import type { Database, Prisma } from "@openplane/db";

export interface MemorySearchInput {
  executionId: string;
  teamId: string;
  missionId?: string;
  agentId?: string;
  query: string;
  mode: "keyword" | "prefix";
  scope?: "workflow" | "agent" | "mission" | "team";
  topK?: number;
}

export interface MemorySearchResult {
  key: string;
  value: unknown;
  scope: string;
}

export interface MemorySearchOutput {
  results: MemorySearchResult[];
  total: number;
}

export interface MemorySearchNodeDependencies {
  db: Database;
}

export function createMemorySearchNodeActivity(
  deps: MemorySearchNodeDependencies
) {
  return async function memorySearchNode(
    input: MemorySearchInput
  ): Promise<MemorySearchOutput> {
    const limit = input.topK ?? 10;
    const missionId = input.missionId ?? input.executionId;

    const where: Prisma.MissionMemoryWhereInput = {
      missionId,
      key:
        input.mode === "prefix"
          ? { startsWith: input.query }
          : { contains: input.query },
    };

    if (input.scope) {
      where.scope = input.scope;
    }
    if (input.agentId) {
      where.agentId = input.agentId;
    }

    const records = await deps.db.missionMemory.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return {
      results: records.map((r) => ({
        key: r.key,
        value: r.value,
        scope: r.scope,
      })),
      total: records.length,
    };
  };
}
