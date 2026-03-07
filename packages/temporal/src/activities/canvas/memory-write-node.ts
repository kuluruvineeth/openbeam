import type { Database } from "@openbeam/db";

export interface MemoryWriteInput {
  executionId: string;
  teamId: string;
  agentId?: string;
  key: string;
  value: unknown;
  scope: "workflow" | "agent" | "team";
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
  _deps: MemoryWriteNodeDependencies
) {
  return function memoryWriteNode(
    input: MemoryWriteInput
  ): Promise<MemoryWriteOutput> {
    return Promise.resolve({
      key: input.key,
      scope: input.scope,
      written: false,
    });
  };
}
