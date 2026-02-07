"use client";

import type {
  NodeStatus,
  ParallelJoinEmptyBranchHandling,
  ParallelJoinErrorHandling,
  ParallelJoinInput,
  ParallelJoinMergeStrategy,
  ParallelJoinMode,
  ParallelJoinNodeConfig,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ParallelJoinNodeData {
  label: string;
  config: ParallelJoinNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelJoinNodeType = Node<ParallelJoinNodeData, "parallel_join">;

const DEFAULT_INPUTS: ParallelJoinInput[] = [
  { id: "input-1", label: "Input 1" },
  { id: "input-2", label: "Input 2" },
];

const JOIN_MODE_META: Record<
  ParallelJoinMode,
  {
    label: string;
    iconName: keyof typeof Icons;
    variant: "node-parallel" | "node-sequential" | "node-info";
  }
> = {
  waitForAll: {
    label: "Wait All",
    iconName: "Layers",
    variant: "node-parallel",
  },
  pickFirst: {
    label: "First",
    iconName: "Zap",
    variant: "node-sequential",
  },
  nOutOfM: {
    label: "N of M",
    iconName: "Users",
    variant: "node-info",
  },
};

const MERGE_STRATEGY_META: Record<
  ParallelJoinMergeStrategy,
  { label: string; iconName: keyof typeof Icons }
> = {
  append: {
    label: "Append",
    iconName: "Plus",
  },
  combine: {
    label: "Combine",
    iconName: "GitMerge",
  },
  keepFirst: {
    label: "Keep First",
    iconName: "Upload",
  },
  keepLast: {
    label: "Keep Last",
    iconName: "Download",
  },
  chooseBranch: {
    label: "Choose",
    iconName: "GitBranch",
  },
};

const EMPTY_HANDLING_META: Record<
  ParallelJoinEmptyBranchHandling,
  { label: string; variant: "node-info" | "node-warning" }
> = {
  includeEmpty: { label: "Include", variant: "node-info" },
  skipEmpty: { label: "Skip", variant: "node-info" },
  failOnEmpty: { label: "Fail", variant: "node-warning" },
};

const ERROR_HANDLING_META: Record<
  ParallelJoinErrorHandling,
  { label: string; variant: "node-warning" | "node-info" }
> = {
  failFast: { label: "Fail Fast", variant: "node-warning" },
  continueOnError: { label: "Continue", variant: "node-info" },
  collectErrors: { label: "Collect", variant: "node-info" },
};

function calculateInputOffsets(inputCount: number): string[] {
  if (inputCount === 0) {
    return [];
  }
  if (inputCount === 1) {
    return ["50%"];
  }
  if (inputCount === 2) {
    return ["33%", "67%"];
  }

  const step = 80 / (inputCount - 1);
  return Array.from({ length: inputCount }, (_, i) => `${10 + i * step}%`);
}

function JoinModeBadge({
  mode,
  requiredCount,
  inputCount,
}: {
  mode: ParallelJoinMode;
  requiredCount?: number;
  inputCount: number;
}) {
  const meta = JOIN_MODE_META[mode];
  const ModeIcon = Icons[meta.iconName];
  const displayLabel =
    mode === "nOutOfM" && requiredCount
      ? `${requiredCount}/${inputCount}`
      : meta.label;

  return (
    <Badge variant={meta.variant}>
      <ModeIcon size={12} />
      <span>{displayLabel}</span>
    </Badge>
  );
}

export const ParallelJoinNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelJoinNodeType>>(
    function ParallelJoinNodeComponent({ data, selected }, ref) {
      const { config } = data;
      const inputs = Array.isArray(config?.inputs)
        ? config.inputs
        : DEFAULT_INPUTS;
      const joinMode = config?.joinMode ?? "waitForAll";
      const mergeStrategy = config?.mergeStrategy ?? "append";
      const emptyBranchHandling = config?.emptyBranchHandling ?? "includeEmpty";
      const errorHandling = config?.errorHandling ?? "failFast";
      const timeoutMs = config?.timeoutMs;
      const requiredCount = config?.requiredCount;
      const preferredBranch = config?.preferredBranch;
      const matchFields = config?.matchFields ?? [];
      const combineType = config?.combineType ?? "inner";

      const preferredLabel = useMemo(
        () => inputs.find((input) => input.id === preferredBranch)?.label,
        [inputs, preferredBranch]
      );

      const inputOffsets = useMemo(
        () => calculateInputOffsets(inputs.length),
        [inputs.length]
      );

      const dynamicHandles = useMemo(() => {
        const handles: Array<{
          id: string;
          type: "target" | "source";
          position: Position;
          offset: string;
        }> = [];

        inputs.forEach((input, index) => {
          handles.push({
            id: input.id,
            type: "target",
            position: Position.Left,
            offset: inputOffsets[index] ?? "50%",
          });
        });

        handles.push({
          id: "output",
          type: "source",
          position: Position.Right,
          offset: "50%",
        });

        return handles;
      }, [inputs, inputOffsets]);

      const MergeIcon = Icons[MERGE_STRATEGY_META[mergeStrategy].iconName];
      const validMatchFields = matchFields.filter(
        (field) => field.left.trim() && field.right.trim()
      );

      const warnings = useMemo(() => {
        const items: string[] = [];
        if (inputs.length < 2) {
          items.push("Add at least two inputs");
        }
        if (mergeStrategy === "combine" && validMatchFields.length === 0) {
          items.push("Combine requires match fields");
        }
        if (
          mergeStrategy === "combine" &&
          validMatchFields.length !== matchFields.length
        ) {
          items.push("Fill in all match fields");
        }
        if (mergeStrategy === "chooseBranch" && !preferredLabel) {
          items.push("Preferred input is required");
        }
        if (
          joinMode === "nOutOfM" &&
          requiredCount !== undefined &&
          (requiredCount < 1 || requiredCount > inputs.length)
        ) {
          items.push("Required inputs are out of range");
        }
        return items;
      }, [
        inputs.length,
        joinMode,
        matchFields.length,
        mergeStrategy,
        preferredLabel,
        requiredCount,
        validMatchFields.length,
      ]);

      const notes = useMemo(() => {
        const items: string[] = [];
        if (joinMode !== "waitForAll") {
          items.push("Execution waits for all inputs");
        }
        if (mergeStrategy === "combine" && inputs.length > 2) {
          items.push("Combine uses first two inputs");
        }
        if (errorHandling === "collectErrors") {
          items.push("Output includes errors when branches fail");
        }
        return items;
      }, [errorHandling, inputs.length, joinMode, mergeStrategy]);

      return (
        <NodeShell
          handles={dynamicHandles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            actions={
              <JoinModeBadge
                inputCount={inputs.length}
                mode={joinMode}
                requiredCount={requiredCount}
              />
            }
            colorVar="--node-parallel"
            icon={<Icons.GitMerge size={20} />}
            subtitle={`${inputs.length} inputs`}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="space-y-1">
                {inputs.slice(0, 5).map((input) => (
                  <div className="flex items-center gap-2" key={input.id}>
                    <div className="size-1.5 rounded-full bg-[hsl(var(--node-parallel))]" />
                    <span className="truncate text-[10px] text-foreground">
                      {input.label}
                    </span>
                  </div>
                ))}
                {inputs.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{inputs.length - 5} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-border/50 border-t pt-2 text-[10px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MergeIcon size={12} />
                  <span>{MERGE_STRATEGY_META[mergeStrategy].label}</span>
                </div>
                {timeoutMs && (
                  <Badge variant="node-info">
                    <Icons.Clock size={10} />
                    <span>
                      {timeoutMs >= 1000
                        ? `${timeoutMs / 1000}s`
                        : `${timeoutMs}ms`}
                    </span>
                  </Badge>
                )}
              </div>

              {mergeStrategy === "combine" && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Combine</span>
                  <span className="font-mono tabular-nums">
                    {combineType} • {validMatchFields.length} fields
                  </span>
                </div>
              )}

              {mergeStrategy === "chooseBranch" && preferredLabel && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Preferred</span>
                  <span className="truncate font-mono tabular-nums">
                    {preferredLabel}
                  </span>
                </div>
              )}

              {emptyBranchHandling !== "includeEmpty" && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">On empty</span>
                  <Badge
                    variant={EMPTY_HANDLING_META[emptyBranchHandling].variant}
                  >
                    {EMPTY_HANDLING_META[emptyBranchHandling].label}
                  </Badge>
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

ParallelJoinNode.displayName = "ParallelJoinNode";

export function createParallelJoinNodeData(): ParallelJoinNodeData {
  const defaultInputs: ParallelJoinInput[] = [
    { id: "input-1", label: "Input 1" },
    { id: "input-2", label: "Input 2" },
  ];

  return {
    label: "Parallel Join",
    config: {
      inputs: defaultInputs,
      joinMode: "waitForAll",
      mergeStrategy: "append",
      emptyBranchHandling: "includeEmpty",
      errorHandling: "failFast",
    },
    inputs: defaultInputs.map((i) => ({
      id: i.id,
      label: i.label,
      type: "control",
      required: true,
    })),
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
