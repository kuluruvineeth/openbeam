import type { Database } from "@openplane/db";

export type MemoryScope = "workflow" | "agent" | "session" | "team";

export interface DurableMemoryEntry {
  key: string;
  value: unknown;
  scope: MemoryScope;
  agentId: string | null;
  sessionId: string;
}

export interface DurableMemorySearchOptions {
  scope?: MemoryScope;
  agentId?: string;
  prefix?: string;
  limit?: number;
}

export interface DurableMemoryStore {
  get(
    sessionId: string,
    key: string,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<unknown | null>;

  set(
    sessionId: string,
    key: string,
    value: unknown,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<void>;

  delete(
    sessionId: string,
    key: string,
    scope?: MemoryScope,
    agentId?: string
  ): Promise<boolean>;

  search(
    sessionId: string,
    options?: DurableMemorySearchOptions
  ): Promise<DurableMemoryEntry[]>;
}

const noop = Function.prototype as () => void;

export function createDurableMemoryStore(_db: Database): DurableMemoryStore {
  return {
    get() {
      return Promise.resolve(null);
    },

    set() {
      noop();
      return Promise.resolve();
    },

    delete() {
      return Promise.resolve(false);
    },

    search() {
      return Promise.resolve([]);
    },
  };
}
