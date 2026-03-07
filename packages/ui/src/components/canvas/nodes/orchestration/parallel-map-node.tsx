"use client";

import type {
  NodeStatus,
  ParallelMapNodeConfig,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ParallelMapNodeData {
  label: string;
  config: ParallelMapNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelMapNodeType = Node<ParallelMapNodeData, "parallel_map">;

const EXECUTION_MODE_LABELS: Record<string, string> = {
  sequential: "Sequential",
  parallel: "Parallel",
  batch: "Batch",
};

const AGGREGATION_LABELS: Record<string, string> = {
  array: "Array",
  object: "Object",
  merge: "Merge",
  custom: "Custom",
};

const VARIABLE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function formatTimeout(timeoutMs: number | undefined): string {
  if (!timeoutMs) {
    return "No limit";
  }
  if (timeoutMs >= 60_000) {
    return `${Math.round(timeoutMs / 60_000)}m`;
  }
  return `${Math.round(timeoutMs / 1000)}s`;
}

function getExecutionMode(
  config: ParallelMapNodeConfig
): "sequential" | "parallel" | "batch" {
  if (config.batchSize !== undefined && config.batchSize > 0) {
    return "batch";
  }
  if ((config.maxConcurrency ?? 10) > 1) {
    return "parallel";
  }
  return "sequential";
}

export const ParallelMapNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelMapNodeType>>(
    function ParallelMapNodeComponent({ data, selected }, ref) {
      const collection = data.config.collection?.trim() ?? "";
      const itemVariable = data.config.itemVariable?.trim() ?? "item";
      const indexVariable = data.config.indexVariable?.trim() ?? "index";
      const maxConcurrency = data.config.maxConcurrency ?? 1;
      const batchSize = data.config.batchSize;
      const batchDelayMs = data.config.batchDelayMs ?? 0;
      const timeout = data.config.timeout;
      const aggregationMode = data.config.aggregationMode ?? "array";
      const continueOnError = data.config.continueOnError ?? false;
      const progressTracking = data.config.progressTracking ?? true;
      const executionMode = getExecutionMode(data.config);
      const timeoutDisplay = formatTimeout(data.config.timeout);
      const aggregationLabel = AGGREGATION_LABELS[aggregationMode] ?? "Array";

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!collection) {
          list.push("Collection required");
        }
        if (!itemVariable) {
          list.push("Item variable required");
        } else if (!VARIABLE_NAME_REGEX.test(itemVariable)) {
          list.push("Item variable must be valid");
        }
        if (!indexVariable) {
          list.push("Index variable required");
        } else if (!VARIABLE_NAME_REGEX.test(indexVariable)) {
          list.push("Index variable must be valid");
        }
        if (itemVariable && indexVariable && itemVariable === indexVariable) {
          list.push("Item/index variables must differ");
        }
        if (maxConcurrency <= 0) {
          list.push("Max concurrency must be at least 1");
        }
        if (batchSize !== undefined && batchSize <= 0) {
          list.push("Batch size must be at least 1");
        }
        if (batchDelayMs < 0) {
          list.push("Batch delay must be zero or higher");
        }
        if (timeout !== undefined && timeout <= 0) {
          list.push("Timeout must be positive");
        }
        return list;
      }, [
        batchDelayMs,
        batchSize,
        collection,
        indexVariable,
        itemVariable,
        maxConcurrency,
        timeout,
      ]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (executionMode === "parallel") {
          list.push(`Parallel up to ${maxConcurrency}`);
        }
        if (executionMode === "batch" && batchSize !== undefined) {
          list.push(`Batch size ${batchSize}`);
        }
        if (batchDelayMs > 0) {
          list.push(`Batch delay ${batchDelayMs}ms`);
        }
        if (aggregationMode !== "array") {
          list.push(`Aggregation ${aggregationLabel}`);
        }
        if (continueOnError) {
          list.push("Continue on error enabled");
        }
        if (!progressTracking) {
          list.push("Progress tracking off");
        }
        if (timeout !== undefined) {
          list.push(`Timeout ${timeoutDisplay}`);
        }
        if (itemVariable !== "item" || indexVariable !== "index") {
          list.push(`Vars ${itemVariable}/${indexVariable}`);
        }
        return list;
      }, [
        aggregationLabel,
        aggregationMode,
        batchDelayMs,
        batchSize,
        continueOnError,
        executionMode,
        indexVariable,
        itemVariable,
        maxConcurrency,
        progressTracking,
        timeout,
        timeoutDisplay,
      ]);

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-orchestration"
            icon={<Icons.GitFork size={20} />}
            subtitle="Parallel"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1.5">
              <NodeField
                label="Collection"
                mono
                value={collection || "Not set"}
              />
              <NodeField
                label="Mode"
                value={EXECUTION_MODE_LABELS[executionMode] ?? "Sequential"}
              />
              {executionMode === "parallel" && (
                <NodeField label="Concurrency" mono value={maxConcurrency} />
              )}
              {data.config.batchSize && (
                <NodeField
                  label="Batch Size"
                  mono
                  value={data.config.batchSize}
                />
              )}
              <NodeField label="Timeout" value={timeoutDisplay} />
              <NodeField label="Aggregation" value={aggregationLabel} />
              <NodeField
                label="Continue on Error"
                value={continueOnError ? "Yes" : "No"}
              />
              <NodeField
                label="Progress"
                value={progressTracking ? "On" : "Off"}
              />
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ParallelMapNode.displayName = "ParallelMapNode";

export function createParallelMapNodeData(): ParallelMapNodeData {
  return {
    label: "Parallel Map",
    config: {
      collection: "",
      itemVariable: "item",
      indexVariable: "index",
      maxConcurrency: 10,
      continueOnError: false,
      batchDelayMs: 0,
      aggregationMode: "array",
      progressTracking: true,
    },
    inputs: [{ id: "items", label: "Items", type: "data", required: true }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: true },
      { id: "errors", label: "Errors", type: "data", required: false },
    ],
  };
}
