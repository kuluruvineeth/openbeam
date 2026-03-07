"use client";

import type {
  NodeStatus,
  ParallelSplitBranch,
  ParallelSplitDataDistribution,
  ParallelSplitErrorHandling,
  ParallelSplitExecutionMode,
  ParallelSplitNodeConfig,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ParallelSplitNodeData {
  label: string;
  config: ParallelSplitNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelSplitNodeType = Node<ParallelSplitNodeData, "parallelSplit">;

const DEFAULT_OUTPUTS: ParallelSplitBranch[] = [
  { id: "output-1", label: "Output 1" },
  { id: "output-2", label: "Output 2" },
  { id: "output-3", label: "Output 3" },
];

const DATA_DISTRIBUTION_META: Record<
  ParallelSplitDataDistribution,
  { label: string; description: string; iconName: keyof typeof Icons }
> = {
  broadcast: {
    label: "Broadcast",
    description: "Same data to all outputs",
    iconName: "Copy",
  },
  roundRobin: {
    label: "Round Robin",
    description: "Distribute items across outputs",
    iconName: "RefreshCw",
  },
  partition: {
    label: "Partition",
    description: "Split by key expression",
    iconName: "Scissors",
  },
};

const ERROR_HANDLING_META: Record<
  ParallelSplitErrorHandling,
  { label: string; variant: "node-warning" | "node-info" }
> = {
  failFast: { label: "Fail Fast", variant: "node-warning" },
  continueOnError: { label: "Continue", variant: "node-info" },
  collectErrors: { label: "Collect", variant: "node-info" },
};

function calculateOutputOffsets(outputCount: number): string[] {
  if (outputCount === 0) {
    return [];
  }
  if (outputCount === 1) {
    return ["50%"];
  }
  if (outputCount === 2) {
    return ["33%", "67%"];
  }

  const step = 80 / (outputCount - 1);
  return Array.from({ length: outputCount }, (_, i) => `${10 + i * step}%`);
}

function ExecutionBadge({ mode }: { mode: ParallelSplitExecutionMode }) {
  const isParallel = mode === "parallel";
  return (
    <Badge variant={isParallel ? "node-parallel" : "node-sequential"}>
      <Icons.GitFork size={12} />
      <span>{isParallel ? "Parallel" : "Sequential"}</span>
    </Badge>
  );
}

export const ParallelSplitNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelSplitNodeType>>(
    function ParallelSplitNodeComponent({ data, selected }, ref) {
      const { config } = data;
      const outputs = Array.isArray(config?.branches)
        ? config.branches
        : DEFAULT_OUTPUTS;
      const executionMode = config?.executionMode ?? "parallel";
      const dataDistribution = config?.dataDistribution ?? "broadcast";
      const errorHandling = config?.errorHandling ?? "failFast";
      const waitForAll = config?.waitForAll ?? true;
      const maxConcurrency = config?.maxConcurrency ?? 10;
      const partitionKey = config?.partitionKey?.trim();

      const warnings = useMemo(() => {
        const items: string[] = [];
        if (outputs.length < 2) {
          items.push("Add at least two outputs");
        }
        if (dataDistribution === "partition" && !partitionKey) {
          items.push("Partition key is required");
        }
        if (executionMode === "parallel" && outputs.length > maxConcurrency) {
          items.push("Outputs exceed max concurrency");
        }
        return items;
      }, [
        dataDistribution,
        executionMode,
        maxConcurrency,
        outputs.length,
        partitionKey,
      ]);

      const notes = useMemo(() => {
        const items: string[] = [];
        if (dataDistribution !== "broadcast") {
          items.push("Input must be an array for distribution");
        }
        if (executionMode === "sequential") {
          items.push("Sequential mode runs one branch at a time");
        }
        return items;
      }, [dataDistribution, executionMode]);

      const outputOffsets = useMemo(
        () => calculateOutputOffsets(outputs.length),
        [outputs.length]
      );

      const dynamicHandles = useMemo(() => {
        const handles: Array<{
          id: string;
          type: "target" | "source";
          position: Position;
          offset: string;
        }> = [
          {
            id: "input",
            type: "target",
            position: Position.Left,
            offset: "50%",
          },
        ];

        outputs.forEach((output, index) => {
          handles.push({
            id: output.id,
            type: "source",
            position: Position.Right,
            offset: outputOffsets[index] ?? "50%",
          });
        });

        return handles;
      }, [outputs, outputOffsets]);

      const DistributionIcon =
        Icons[DATA_DISTRIBUTION_META[dataDistribution].iconName];

      return (
        <NodeShell
          handles={dynamicHandles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            actions={<ExecutionBadge mode={executionMode} />}
            colorVar="--node-parallel"
            icon={<Icons.GitFork size={20} />}
            subtitle={`${outputs.length} outputs`}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="space-y-1">
                {outputs.slice(0, 5).map((output) => (
                  <div className="flex items-center gap-2" key={output.id}>
                    <div className="size-1.5 rounded-full bg-[hsl(var(--node-parallel))]" />
                    <span className="truncate text-[10px] text-foreground">
                      {output.label}
                    </span>
                  </div>
                ))}
                {outputs.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{outputs.length - 5} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-border/50 border-t pt-2 text-[10px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DistributionIcon size={12} />
                  <span>{DATA_DISTRIBUTION_META[dataDistribution].label}</span>
                </div>
                <Badge variant={waitForAll ? "node-info" : "node-warning"}>
                  <Icons.Clock size={10} />
                  <span>{waitForAll ? "Sync" : "Sync (enforced)"}</span>
                </Badge>
              </div>

              {executionMode === "parallel" && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Concurrency</span>
                  <span className="font-mono tabular-nums">
                    {maxConcurrency}
                  </span>
                </div>
              )}

              {dataDistribution === "partition" && partitionKey && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Partition key</span>
                  <span className="max-w-[140px] truncate font-mono tabular-nums">
                    {partitionKey}
                  </span>
                </div>
              )}

              {errorHandling !== "failFast" && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">On error</span>
                  <Badge variant={ERROR_HANDLING_META[errorHandling].variant}>
                    {ERROR_HANDLING_META[errorHandling].label}
                  </Badge>
                </div>
              )}

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

ParallelSplitNode.displayName = "ParallelSplitNode";

export function createParallelSplitNodeData(): ParallelSplitNodeData {
  const defaultOutputs: ParallelSplitBranch[] = [
    { id: "output-1", label: "Output 1" },
    { id: "output-2", label: "Output 2" },
    { id: "output-3", label: "Output 3" },
  ];

  return {
    label: "Parallel Split",
    config: {
      branches: defaultOutputs,
      dataDistribution: "broadcast",
      executionMode: "parallel",
      maxConcurrency: 10,
      waitForAll: true,
      errorHandling: "failFast",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: defaultOutputs.map((o) => ({
      id: o.id,
      label: o.label,
      type: "control",
      required: false,
    })),
  };
}
