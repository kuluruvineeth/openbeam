import type { Database } from "@openplane/db";
import { evaluateExpression } from "@openplane/services/canvas/expression";
import { resolveNodeConfig } from "@openplane/services/canvas/node-config";
import { ParallelMapNodeConfigSchema } from "@openplane/types/canvas";
import type {
  ExecuteParallelMapNodeInput,
  ExecuteParallelMapNodeOutput,
  ResolveParallelMapBatchInput,
  ResolveParallelMapBatchOutput,
  StoreParallelMapOutputInput,
  StoreParallelMapOutputOutput,
} from "@openplane/types/temporal";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

export interface ExecuteParallelMapNodeDependencies {
  db: Database;
  maxInlineBytes?: number;
}

function assertCollectionExpression(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new Error("Parallel map collection expression is required");
  }
  return trimmed;
}

function ensureArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Parallel map collection must be an array");
  }
  return value;
}

export function createExecuteParallelMapNodeActivity(
  deps: ExecuteParallelMapNodeDependencies
) {
  return async function executeParallelMapNodeActivity(
    input: ExecuteParallelMapNodeInput
  ): Promise<ExecuteParallelMapNodeOutput> {
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

    const config = ParallelMapNodeConfigSchema.parse(
      resolveNodeConfig(input.node.data)
    );
    const expression = assertCollectionExpression(config.collection);
    const collectionValue = await evaluateExpression({
      expression,
      language: "javascript",
      data: resolvedInput,
    });
    const collection = ensureArray(collectionValue);
    const collectionRef = await claimCheck.put(collection, {
      nodeId: input.node.id,
    });

    const completedAt = Date.now();

    return {
      collectionRef,
      collectionSize: collection.length,
      inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
      startedAt,
      completedAt,
      latencyMs: completedAt - startedAt,
    };
  };
}

export function createResolveParallelMapBatchActivity(
  deps: ExecuteParallelMapNodeDependencies
) {
  return async function resolveParallelMapBatchActivity(
    input: ResolveParallelMapBatchInput
  ): Promise<ResolveParallelMapBatchOutput> {
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const collectionValue = await resolvePayload(
      input.collectionRef,
      claimCheck
    );
    const collection = ensureArray(collectionValue);
    const offset = Math.max(0, input.offset);
    const limit = input.limit ?? collection.length - offset;
    const end = offset + Math.max(0, limit);

    return {
      items: collection.slice(offset, end),
    };
  };
}

export function createStoreParallelMapOutputActivity(
  deps: ExecuteParallelMapNodeDependencies
) {
  return async function storeParallelMapOutputActivity(
    input: StoreParallelMapOutputInput
  ): Promise<StoreParallelMapOutputOutput> {
    const startedAt = Date.now();
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const storedOutput = await storePayload(
      input.output,
      claimCheck,
      { maxInlineBytes: deps.maxInlineBytes },
      { nodeId: input.nodeId }
    );
    const completedAt = Date.now();

    return {
      output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
      outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
      startedAt,
      completedAt,
      latencyMs: completedAt - startedAt,
    };
  };
}
