"use client";

import type {
  LoopExecutionMode,
  LoopNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
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
  const isParallel = mode === "parallel";
  const Icon = Icons[meta.iconName];
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-[10px]",
        isParallel
          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
          : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
      )}
    >
      <Icon size={12} />
      <span>{meta.label}</span>
    </div>
  );
}

export const LoopNode = memo(
  forwardRef<HTMLDivElement, NodeProps<LoopNodeType>>(
    function LoopNodeComponent({ data, selected }, ref) {
      const { config } = data;
      const executionMode = config.executionMode ?? "sequential";
      const preview = useMemo(() => getLoopPreview(config), [config]);
      const showBatchInfo = executionMode === "batch";
      const showWarning = hasWarning(config, executionMode);

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
                  <span
                    className={cn(
                      "rounded-sm px-1 py-0.5 font-medium",
                      config.errorHandling === "continue"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {config.errorHandling === "continue" ? "Skip" : "Collect"}
                  </span>
                </div>
              )}

              {showWarning && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Review config for performance</span>
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
