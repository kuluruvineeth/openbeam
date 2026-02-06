import type { Database } from "@openplane/db";

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
    // biome-ignore lint/suspicious/noExplicitAny: Prisma delegate access for dynamic model
    const db = deps.db as any;
    const limit = input.topK ?? 10;
    const missionId = input.missionId ?? input.executionId;

    const where: Record<string, unknown> = {
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

    const records = await db.missionMemory.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return {
      // biome-ignore lint/suspicious/noExplicitAny: Prisma dynamic model result
      results: records.map((r: any) => ({
        key: r.key,
        value: r.value,
        scope: r.scope,
      })),
      total: records.length,
    };
  };
}
