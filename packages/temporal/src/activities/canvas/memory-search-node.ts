import type { Database } from "@openplane/db";

export interface MemorySearchInput {
  executionId: string;
  teamId: string;
  agentId?: string;
  query: string;
  mode: "keyword" | "prefix";
  scope?: "workflow" | "agent" | "team";
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
  _deps: MemorySearchNodeDependencies
) {
  return function memorySearchNode(
    _input: MemorySearchInput
  ): Promise<MemorySearchOutput> {
    return Promise.resolve({ results: [], total: 0 });
  };
}
