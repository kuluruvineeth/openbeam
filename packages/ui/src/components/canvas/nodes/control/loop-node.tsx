"use client";

import type {
  LoopExecutionMode,
  LoopNodeConfig,
  NodeStatus,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface LoopNodeData {
  label: string;
  config: LoopNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type LoopNodeType = Node<LoopNodeData, "loop">;

const EXECUTION_MODE_META: Record<
  LoopExecutionMode,
  { label: string; iconName: "ArrowRight" | "GitFork" | "Layers" }
> = {
  sequential: { label: "Seq", iconName: "ArrowRight" },
  parallel: { label: "Par", iconName: "GitFork" },
  batch: { label: "Batch", iconName: "Layers" },
};

function getLoopPreview(config: LoopNodeConfig): string {
  const { type, collection, condition, times } = config;
  if (type === "forEach") {
    return `For each in ${collection || "items"}`;
  }
  if (type === "while") {
    return `While ${condition || "condition"}`;
  }
  if (type === "times") {
    return `Repeat ${times ?? 1} times`;
  }
  return "Configure loop";
}

function hasWarning(
  config: LoopNodeConfig,
  executionMode: LoopExecutionMode
): boolean {
  if (executionMode === "parallel" && (config.times ?? 0) > 50) {
    return true;
  }
  if (executionMode === "batch" && (config.batchSize ?? 10) > 100) {
    return true;
  }
  if (config.type === "while" && !config.breakCondition) {
    return true;
  }
  if ((config.maxIterations ?? 100) > 1000) {
    return true;
  }
  return false;
}

function ExecutionBadge({ mode }: { mode: LoopExecutionMode }) {
  const meta = EXECUTION_MODE_META[mode];
  const Icon = Icons[meta.iconName];
  return (
    <Badge variant={mode === "parallel" ? "node-parallel" : "node-sequential"}>
      <Icon size={12} />
      <span>{meta.label}</span>
    </Badge>
  );
}

export const LoopNode = memo(
  forwardRef<HTMLDivElement, NodeProps<LoopNodeType>>(
    function LoopNodeComponent({ data, selected }, ref) {
      const { config } = data;
      const executionMode = config.executionMode ?? "sequential";
      const unsupportedMode = executionMode !== "sequential";
      const preview = useMemo(() => getLoopPreview(config), [config]);
      const showBatchInfo = executionMode === "batch";
      const showWarning = hasWarning(config, executionMode);
      const missingCollection =
        config.type === "forEach" && !config.collection?.trim();
      const missingCondition =
        config.type === "while" && !config.condition?.trim();
      const missingTimes =
        config.type === "times" && !(config.times && config.times > 0);
      const missingAggregate =
        config.outputMode === "aggregate" &&
        !config.aggregateExpression?.trim();

      return (
        <NodeShell
          handles={[
            {
              id: "input",
              type: "target",
              position: Position.Left,
              offset: "50%",
            },
            {
              id: "body",
              type: "source",
              position: Position.Right,
              offset: "35%",
            },
            {
              id: "done",
              type: "source",
              position: Position.Right,
              offset: "65%",
              variant: "done",
            },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            actions={<ExecutionBadge mode={executionMode} />}
            colorVar="--node-loop"
            icon={<Icons.Repeat size={20} />}
            subtitle={preview}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {showBatchInfo && (
                <div className="flex items-center gap-2 rounded-sm bg-muted/50 px-2 py-1.5 text-[10px]">
                  <span className="text-muted-foreground">Batch:</span>
                  <span className="font-mono">{config.batchSize ?? 10}</span>
                  {(config.batchDelayMs ?? 0) > 0 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Delay:</span>
                      <span className="font-mono">{config.batchDelayMs}ms</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Max iterations</span>
                <span className="font-mono tabular-nums">
                  {config.maxIterations ?? 100}
                </span>
              </div>

              {config.errorHandling && config.errorHandling !== "stop" && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">On error</span>
                  <Badge
                    variant={
                      config.errorHandling === "continue"
                        ? "node-warning"
                        : "node-info"
                    }
                  >
                    {config.errorHandling === "continue" ? "Skip" : "Collect"}
                  </Badge>
                </div>
              )}

              {showWarning && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Review config for performance</span>
                </div>
              )}

              {missingCollection && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Collection required</span>
                </div>
              )}

              {missingCondition && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Condition required</span>
                </div>
              )}

              {missingTimes && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Iterations required</span>
                </div>
              )}

              {missingAggregate && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Aggregation required</span>
                </div>
              )}

              {unsupportedMode && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Only sequential is supported</span>
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

LoopNode.displayName = "LoopNode";

export function createLoopNodeData(): LoopNodeData {
  return {
    label: "Loop",
    config: {
      type: "forEach",
      executionMode: "sequential",
      batchSize: 10,
      batchDelayMs: 0,
      errorHandling: "stop",
      maxIterations: 100,
      outputMode: "all",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [
      { id: "body", label: "Body", type: "control", required: false },
      { id: "done", label: "Done", type: "control", required: false },
    ],
  };
}
