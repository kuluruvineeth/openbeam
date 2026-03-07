import type { Database } from "@openbeam/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openbeam/db";
import { evaluateExpression } from "@openbeam/services/canvas/expression";
import { resolveNodeConfig } from "@openbeam/services/canvas/node-config";
import { ParallelSplitNodeConfigSchema } from "@openbeam/types/canvas";
import type {
  ExecuteParallelSplitNodeInput,
  ExecuteParallelSplitNodeOutput,
  ParallelSplitBranchInput,
} from "@openbeam/types/temporal";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

export interface ExecuteParallelSplitNodeDependencies {
  db: Database;
  maxInlineBytes?: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1_000_000_007;
  }
  return Math.abs(hash);
}

function normalizeBranchIds(config: {
  branches: Array<{ id: string }>;
}): string[] {
  return config.branches.map((branch) => branch.id);
}

function assertArrayInput(input: unknown): unknown[] {
  if (!Array.isArray(input)) {
    throw new Error("Parallel split input must be an array for distribution");
  }
  return input;
}

function createEmptyBuckets(branchIds: string[]): Record<string, unknown[]> {
  return branchIds.reduce<Record<string, unknown[]>>((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});
}

function distributeRoundRobin(params: {
  input: unknown;
  branchIds: string[];
}): Record<string, unknown[]> {
  const items = assertArrayInput(params.input);
  const buckets = createEmptyBuckets(params.branchIds);
  const count = params.branchIds.length;
  if (count === 0) {
    throw new Error("Parallel split requires branches");
  }

  items.forEach((item, index) => {
    const branchId = params.branchIds[index % count];
    if (!branchId) {
      throw new Error("Parallel split branch not found");
    }
    const bucket = buckets[branchId];
    if (!bucket) {
      throw new Error("Parallel split branch bucket not found");
    }
    bucket.push(item);
  });

  return buckets;
}

async function distributePartition(params: {
  input: unknown;
  branchIds: string[];
  partitionKey: string;
}): Promise<Record<string, unknown[]>> {
  const items = assertArrayInput(params.input);
  const buckets = createEmptyBuckets(params.branchIds);
  const count = params.branchIds.length;
  if (count === 0) {
    throw new Error("Parallel split requires branches");
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const key = await evaluateExpression({
      expression: params.partitionKey,
      language: "javascript",
      data: item,
      context: { item, index, input: params.input },
    });
    const keyHash = hashString(String(key ?? ""));
    const branchId = params.branchIds[keyHash % count];
    if (!branchId) {
      throw new Error("Parallel split branch not found");
    }
    const bucket = buckets[branchId];
    if (!bucket) {
      throw new Error("Parallel split branch bucket not found");
    }
    bucket.push(item);
  }

  return buckets;
}

async function materializeBranchInputs(params: {
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  nodeId: string;
  maxInlineBytes?: number;
  inputs: Record<string, unknown>;
  branchOrder: string[];
}): Promise<ParallelSplitBranchInput[]> {
  const branches: ParallelSplitBranchInput[] = [];

  for (const branchId of params.branchOrder) {
    const value = params.inputs[branchId];
    const stored = await storePayload(
      value,
      params.claimCheck,
      { maxInlineBytes: params.maxInlineBytes },
      { nodeId: params.nodeId }
    );
    if (isExecutionDataRef(stored)) {
      branches.push({ branchId, inputRef: stored });
    } else {
      branches.push({ branchId, input: stored });
    }
  }

  return branches;
}

export function createExecuteParallelSplitNodeActivity(
  deps: ExecuteParallelSplitNodeDependencies
) {
  return async function executeParallelSplitNodeActivity(
    input: ExecuteParallelSplitNodeInput
  ): Promise<ExecuteParallelSplitNodeOutput> {
    const startedAt = Date.now();
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const resolvedInput = isExecutionDataRef(input.input)
      ? await resolvePayload(input.input, claimCheck)
      : input.input;
    const storedInput = isExecutionDataRef(input.input)
      ? input.input
      : await storePayload(
          resolvedInput,
          claimCheck,
          { maxInlineBytes: deps.maxInlineBytes },
          { nodeId: input.node.id }
        );

    const step = await createAgentCanvasExecutionStep(deps.db, input.teamId, {
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: "RUNNING",
      input: storedInput,
      startedAt: new Date(startedAt),
    });

    try {
      const config = ParallelSplitNodeConfigSchema.parse(
        resolveNodeConfig(input.node.data)
      );
      const branchIds = normalizeBranchIds(config);
      let branchInputs: Record<string, unknown>;

      if (config.dataDistribution === "broadcast") {
        const broadcastValue = isExecutionDataRef(storedInput)
          ? storedInput
          : resolvedInput;
        branchInputs = branchIds.reduce<Record<string, unknown>>((acc, id) => {
          acc[id] = broadcastValue;
          return acc;
        }, {});
      } else if (config.dataDistribution === "roundRobin") {
        branchInputs = await distributeRoundRobin({
          input: resolvedInput,
          branchIds,
        });
      } else {
        if (!config.partitionKey?.trim()) {
          throw new Error("Partition key expression is required");
        }
        branchInputs = await distributePartition({
          input: resolvedInput,
          branchIds,
          partitionKey: config.partitionKey,
        });
      }

      const branches = await materializeBranchInputs({
        claimCheck,
        nodeId: input.node.id,
        maxInlineBytes: deps.maxInlineBytes,
        inputs: branchInputs,
        branchOrder: branchIds,
      });

      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;
      const output = { branches };

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "COMPLETED",
        output,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      return {
        output,
        inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
        startedAt,
        completedAt,
        latencyMs,
      };
    } catch (error) {
      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "FAILED",
        error: message,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      throw error;
    }
  };
}
