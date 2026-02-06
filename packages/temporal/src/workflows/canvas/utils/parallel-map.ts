import type { ParallelMapNodeConfig } from "@openplane/types/canvas";
import { isRecord } from "./type-guards";

type ParallelMapItemResult =
  | { status: "fulfilled"; index: number; item: unknown; output: unknown }
  | { status: "rejected"; index: number; item: unknown; error: string };

export function buildParallelMapItemInput(params: {
  input: unknown;
  item: unknown;
  index: number;
  config: ParallelMapNodeConfig;
}): Record<string, unknown> {
  const itemKey = params.config.itemVariable?.trim() || "item";
  const indexKey = params.config.indexVariable?.trim() || "index";

  return {
    [itemKey]: params.item,
    [indexKey]: params.index,
    input: params.input,
  };
}

export function mergeRecordValue(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isRecord(existing) && isRecord(value)) {
      target[key] = mergeRecordValue({ ...existing }, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export function aggregateParallelMapResults(params: {
  entries: ParallelMapItemResult[];
  mode: ParallelMapNodeConfig["aggregationMode"];
  continueOnError: boolean;
}): unknown {
  const errors = params.entries
    .filter(
      (
        entry
      ): entry is Extract<ParallelMapItemResult, { status: "rejected" }> =>
        entry.status === "rejected"
    )
    .map((entry) => ({
      index: entry.index,
      item: entry.item,
      error: entry.error,
    }));

  switch (params.mode) {
    case "array":
      return params.entries;
    case "object": {
      const result: Record<string, unknown> = {};
      for (const entry of params.entries) {
        const key = String(entry.index);
        result[key] =
          entry.status === "fulfilled"
            ? entry.output
            : { error: entry.error, item: entry.item };
      }
      return result;
    }
    case "merge": {
      let merged: Record<string, unknown> = {};
      for (const entry of params.entries) {
        if (entry.status !== "fulfilled") {
          continue;
        }
        if (isRecord(entry.output)) {
          merged = mergeRecordValue(merged, entry.output);
        } else {
          merged[String(entry.index)] = entry.output;
        }
      }
      if (params.continueOnError && errors.length > 0) {
        return { result: merged, errors };
      }
      return merged;
    }
    case "custom":
      return { results: params.entries, errors };
    default:
      return params.entries;
  }
}
