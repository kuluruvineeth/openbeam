import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openplane/db";
import { resolveNodeConfig } from "@openplane/services/canvas/node-config";
import { ParallelJoinNodeConfigSchema } from "@openplane/types/canvas";
import type {
  ExecuteParallelJoinNodeInput,
  ExecuteParallelJoinNodeOutput,
  ParallelJoinBranchResult,
} from "@openplane/types/temporal";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

export interface ExecuteParallelJoinNodeDependencies {
  db: Database;
  maxInlineBytes?: number;
}

type ResolvedBranch = {
  branchId: string;
  value: unknown;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPathValue(value: unknown, path: string): unknown {
  if (!path) {
    return;
  }
  const parts = path.split(".").filter(Boolean);
  let current: unknown = value;
  for (const part of parts) {
    if (!isRecord(current)) {
      return;
    }
    current = current[part];
  }
  return current;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (isRecord(value)) {
    return Object.keys(value).length === 0;
  }
  return false;
}

function orderBranches(params: {
  configInputs: Array<{ id: string }>;
  branches: ParallelJoinBranchResult[];
}): ParallelJoinBranchResult[] {
  const byId = new Map(
    params.branches.map((branch) => [branch.branchId, branch])
  );
  return params.configInputs.map((input) => {
    const existing = byId.get(input.id);
    return (
      existing ?? {
        branchId: input.id,
        error: undefined,
        output: undefined,
        outputRef: undefined,
      }
    );
  });
}

function applyJoinMode(params: {
  branches: ResolvedBranch[];
  joinMode: "waitForAll" | "pickFirst" | "nOutOfM";
  requiredCount?: number;
}): ResolvedBranch[] {
  if (params.joinMode === "waitForAll") {
    return params.branches;
  }

  if (params.joinMode === "pickFirst") {
    return params.branches.slice(0, 1);
  }

  const required = params.requiredCount ?? params.branches.length;
  if (required > params.branches.length) {
    throw new Error("Required branch count exceeds available branches");
  }
  if (required <= 0) {
    return [];
  }
  return params.branches.slice(0, required);
}

function applyEmptyHandling(params: {
  branches: ResolvedBranch[];
  emptyHandling: "includeEmpty" | "skipEmpty" | "failOnEmpty";
}): ResolvedBranch[] {
  if (params.emptyHandling === "includeEmpty") {
    return params.branches;
  }

  const empties = params.branches.filter((branch) =>
    isEmptyValue(branch.value)
  );

  if (params.emptyHandling === "failOnEmpty" && empties.length > 0) {
    throw new Error("Parallel join encountered empty branch output");
  }

  return params.branches.filter((branch) => !isEmptyValue(branch.value));
}

function mergeAppend(values: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      result.push(...value);
    } else if (value !== undefined) {
      result.push(value);
    }
  }
  return result;
}

function mergeKeepFirst(values: unknown[]): unknown {
  return values[0];
}

function mergeKeepLast(values: unknown[]): unknown {
  return values.at(-1);
}

function mergeChooseBranch(params: {
  branches: ResolvedBranch[];
  preferredBranch?: string;
}): unknown {
  if (!params.preferredBranch) {
    throw new Error("Preferred branch is required for choose branch merge");
  }
  const selected = params.branches.find(
    (branch) => branch.branchId === params.preferredBranch
  );
  if (!selected) {
    throw new Error("Preferred branch output not found");
  }
  return selected.value;
}

function buildRightIndex(
  rightItems: unknown[],
  matchFields: Array<{ right: string }>
): Map<string, Array<{ item: Record<string, unknown>; index: number }>> {
  const index = new Map<
    string,
    Array<{ item: Record<string, unknown>; index: number }>
  >();

  for (let i = 0; i < rightItems.length; i++) {
    const rightItem = rightItems[i];
    if (!isRecord(rightItem)) {
      throw new Error("Combine merge requires object items");
    }

    const keyParts = matchFields.map((field) =>
      JSON.stringify(getPathValue(rightItem, field.right))
    );
    const key = keyParts.join("|");

    const existing = index.get(key);
    if (existing) {
      existing.push({ item: rightItem, index: i });
    } else {
      index.set(key, [{ item: rightItem, index: i }]);
    }
  }

  return index;
}

function mergeCombine(params: {
  left: unknown;
  right: unknown;
  matchFields: Array<{ left: string; right: string }>;
  combineType: "inner" | "left" | "right" | "outer";
}): unknown[] {
  if (!(Array.isArray(params.left) && Array.isArray(params.right))) {
    throw new Error("Combine merge requires array outputs");
  }

  const leftItems = params.left;
  const rightItems = params.right;
  const matches: unknown[] = [];
  const matchedRightIndices = new Set<number>();

  const rightIndex = buildRightIndex(rightItems, params.matchFields);

  for (const leftItem of leftItems) {
    if (!isRecord(leftItem)) {
      throw new Error("Combine merge requires object items");
    }

    const keyParts = params.matchFields.map((field) =>
      JSON.stringify(getPathValue(leftItem, field.left))
    );
    const key = keyParts.join("|");

    const matchingRight = rightIndex.get(key);

    if (matchingRight && matchingRight.length > 0) {
      for (const { item: rightItem, index: rightIdx } of matchingRight) {
        matchedRightIndices.add(rightIdx);
        matches.push({ ...leftItem, ...rightItem });
      }
    } else if (
      params.combineType === "left" ||
      params.combineType === "outer"
    ) {
      matches.push(leftItem);
    }
  }

  if (params.combineType === "right" || params.combineType === "outer") {
    for (let index = 0; index < rightItems.length; index++) {
      if (!matchedRightIndices.has(index)) {
        matches.push(rightItems[index]);
      }
    }
  }

  return matches;
}

export function createExecuteParallelJoinNodeActivity(
  deps: ExecuteParallelJoinNodeDependencies
) {
  return async function executeParallelJoinNodeActivity(
    input: ExecuteParallelJoinNodeInput
  ): Promise<ExecuteParallelJoinNodeOutput> {
    const startedAt = Date.now();
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const storedInput = await storePayload(
      input.branches,
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
      const config = ParallelJoinNodeConfigSchema.parse(
        resolveNodeConfig(input.node.data)
      );
      const orderedBranches = orderBranches({
        configInputs: config.inputs,
        branches: input.branches,
      });
      const resolvedBranches: ResolvedBranch[] = [];

      for (const branch of orderedBranches) {
        const value = isExecutionDataRef(branch.outputRef)
          ? await resolvePayload(branch.outputRef, claimCheck)
          : branch.output;
        resolvedBranches.push({
          branchId: branch.branchId,
          value,
          error: branch.error,
        });
      }

      const errors = resolvedBranches.filter((branch) => branch.error);

      if (errors.length > 0 && config.errorHandling === "failFast") {
        throw new Error(errors[0]?.error ?? "Parallel branch failed");
      }

      const branchesForMerge = resolvedBranches.filter(
        (branch) => !branch.error
      );

      const selected = applyJoinMode({
        branches: branchesForMerge,
        joinMode: config.joinMode,
        requiredCount: config.requiredCount,
      });

      const finalBranches = applyEmptyHandling({
        branches: selected,
        emptyHandling: config.emptyBranchHandling,
      });

      const values = finalBranches.map((branch) => branch.value);
      let output: unknown;

      if (config.mergeStrategy === "append") {
        output = mergeAppend(values);
      } else if (config.mergeStrategy === "keepFirst") {
        output = mergeKeepFirst(values);
      } else if (config.mergeStrategy === "keepLast") {
        output = mergeKeepLast(values);
      } else if (config.mergeStrategy === "chooseBranch") {
        output = mergeChooseBranch({
          branches: resolvedBranches,
          preferredBranch: config.preferredBranch,
        });
      } else {
        if (!config.matchFields || config.matchFields.length === 0) {
          throw new Error("Combine merge requires match fields");
        }
        const left = values[0];
        const right = values[1];
        output = mergeCombine({
          left,
          right,
          matchFields: config.matchFields,
          combineType: config.combineType ?? "inner",
        });
      }

      if (config.errorHandling === "collectErrors" && errors.length > 0) {
        output = {
          result: output,
          errors: errors.map((branch) => ({
            branchId: branch.branchId,
            error: branch.error,
          })),
        };
      }

      const storedOutput = await storePayload(
        output,
        claimCheck,
        { maxInlineBytes: deps.maxInlineBytes },
        { nodeId: input.node.id }
      );

      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "COMPLETED",
        output: storedOutput,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      return {
        output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
        outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
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
