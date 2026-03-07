import { ConditionNodeConfigSchema } from "@openbeam/types/canvas";
import { selectConditionBranch } from "../conditions";
import { CanvasNodeExecutionError } from "../errors";
import { evaluateFunctionBody } from "../expression";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

type BranchSelection = {
  branchId: string | null;
  matchedBranchIds: string[];
};

function hasDefaultBranch(config: {
  branches: Array<{ id: string }>;
  defaultBranchLabel?: string;
}): boolean {
  return (
    config.branches.length > 0 && Boolean(config.defaultBranchLabel?.trim())
  );
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildBranchLookup(config: {
  branches: Array<{ id: string; label: string }>;
  defaultBranchLabel?: string;
}): Map<string, string> {
  const lookup = new Map<string, string>();

  if (config.branches.length === 0) {
    lookup.set("true", "true");
    lookup.set("false", "false");
    return lookup;
  }

  for (const branch of config.branches) {
    lookup.set(normalizeKey(branch.id), branch.id);
    lookup.set(normalizeKey(branch.label), branch.id);
  }

  if (hasDefaultBranch(config)) {
    lookup.set("default", "default");
    lookup.set(normalizeKey(config.defaultBranchLabel ?? ""), "default");
  }

  return lookup;
}

function resolveBranchId(
  value: unknown,
  lookup: Map<string, string>
): string | null {
  if (typeof value === "boolean") {
    return lookup.get(value ? "true" : "false") ?? null;
  }

  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    if (!normalized) {
      return null;
    }
    return lookup.get(normalized) ?? null;
  }

  return null;
}

function resolveBranchSelection(
  value: unknown,
  config: {
    branches: Array<{ id: string; label: string }>;
    defaultBranchLabel?: string;
  }
): BranchSelection {
  const lookup = buildBranchLookup(config);
  if (Array.isArray(value)) {
    const resolved = value
      .map((item) => resolveBranchId(item, lookup))
      .filter((item): item is string => Boolean(item));
    const unique = Array.from(new Set(resolved));
    return {
      branchId: unique[0] ?? null,
      matchedBranchIds: unique,
    };
  }

  const branchId = resolveBranchId(value, lookup);
  return {
    branchId,
    matchedBranchIds: branchId ? [branchId] : [],
  };
}

export const conditionExecutor: CanvasNodeExecutor = ({ node, input }) => {
  const config = ConditionNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    if (config.mode === "expression") {
      const result = evaluateFunctionBody({
        body: config.expression ?? "",
        args: ["input"],
        argValues: [input],
        context: {
          data: input,
          $data: input,
          $input: input,
        },
      });

      const selection = resolveBranchSelection(result, config);
      if (!selection.branchId && hasDefaultBranch(config)) {
        return { branchId: "default", matchedBranchIds: ["default"] };
      }

      return selection;
    }

    if (config.branches.length === 0) {
      throw new Error("Condition node has no branches configured");
    }

    const branchId = selectConditionBranch(
      config.branches,
      config.evaluationOrder,
      input
    );

    if (!branchId && hasDefaultBranch(config)) {
      return { branchId: "default", matchedBranchIds: ["default"] };
    }

    return {
      branchId,
      matchedBranchIds: branchId ? [branchId] : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
