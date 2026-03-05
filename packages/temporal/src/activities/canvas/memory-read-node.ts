import type { Database } from "@openplane/db";

export interface MemoryReadInput {
  executionId: string;
  teamId: string;
  agentId?: string;
  key: string;
  scope: "workflow" | "agent" | "team";
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

export function createMemoryReadNodeActivity(
  _deps: MemoryReadNodeDependencies
) {
  return function memoryReadNode(
    input: MemoryReadInput
  ): Promise<MemoryReadOutput> {
    if (input.throwOnMissing) {
      return Promise.reject(
        new Error(
          `Memory key "${input.key}" not found in scope "${input.scope}"`
        )
      );
    }

    return Promise.resolve({
      key: input.key,
      value: input.defaultValue ?? null,
      found: false,
    });
  };
}
