import type { Database } from "@openplane/db";

export type MemoryScope = "workflow" | "agent" | "mission" | "team";

export interface DurableMemoryEntry {
  key: string;
  value: unknown;
  scope: MemoryScope;
  agentId: string | null;
  missionId: string;
}

export interface DurableMemorySearchOptions {
  scope?: MemoryScope;
  agentId?: string;
  prefix?: string;
  limit?: number;
}

export interface DurableMemoryStore {
  get(
    missionId: string,
    key: string,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<unknown | null>;

  set(
    missionId: string,
    key: string,
    value: unknown,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<void>;

  delete(
    missionId: string,
    key: string,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<boolean>;

  search(
    missionId: string,
    options?: DurableMemorySearchOptions
  ): Promise<DurableMemoryEntry[]>;
}

export function createDurableMemoryStore(db: Database): DurableMemoryStore {
  return {
    async get(missionId, key, scope = "mission", agentId = "") {
      const record = await db.missionMemory.findUnique({
        where: {
          missionId_agentId_key_scope: {
            missionId,
            agentId,
            key,
            scope,
          },
        },
      });

      return record?.value ?? null;
    },

    // biome-ignore lint/nursery/useMaxParams: interface contract requires 5 parameters
    async set(missionId, key, value, scope = "mission", agentId = "") {
      await db.missionMemory.upsert({
        where: {
          missionId_agentId_key_scope: {
            missionId,
            agentId,
            key,
            scope,
          },
        },
        create: {
          missionId,
          agentId,
          key,
          scope,
          value: value as never,
        },
        update: {
          value: value as never,
        },
      });
    },

    async delete(missionId, key, scope = "mission", agentId = "") {
      try {
        await db.missionMemory.delete({
          where: {
            missionId_agentId_key_scope: {
              missionId,
              agentId,
              key,
              scope,
            },
          },
        });
        return true;
      } catch {
        return false;
      }
    },

    async search(missionId, options = {}) {
      const where: Record<string, unknown> = { missionId };
      if (options.scope) {
        where.scope = options.scope;
      }
      if (options.agentId) {
        where.agentId = options.agentId;
      }
      if (options.prefix) {
        where.key = { startsWith: options.prefix };
      }

      const records = await db.missionMemory.findMany({
        where,
        take: options.limit ?? 50,
        orderBy: { updatedAt: "desc" },
      });

      return records.map((r) => ({
        key: r.key,
        value: r.value,
        scope: r.scope as MemoryScope,
        agentId: r.agentId,
        missionId: r.missionId,
      }));
    },
  };
}
