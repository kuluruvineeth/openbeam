import type { ExecutionPlanNode } from "@openplane/types/canvas";

export const RETRY_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);

export const TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);

export const TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);

export const PARALLEL_MAP_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
  "parallel_map",
]);

export function resolveNodeConfig(data: unknown): unknown {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if ("config" in record) {
      return record.config;
    }
  }

  return data;
}

export function isRetryTargetType(type: ExecutionPlanNode["type"]): boolean {
  return !RETRY_FORBIDDEN_TARGET_TYPES.has(type);
}

export function isTryCatchTryTargetType(
  type: ExecutionPlanNode["type"]
): boolean {
  return !TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES.has(type);
}

export function isTryCatchCatchTargetType(
  type: ExecutionPlanNode["type"]
): boolean {
  return !TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES.has(type);
}

export function isParallelMapTargetType(
  type: ExecutionPlanNode["type"]
): boolean {
  return !PARALLEL_MAP_FORBIDDEN_TARGET_TYPES.has(type);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
