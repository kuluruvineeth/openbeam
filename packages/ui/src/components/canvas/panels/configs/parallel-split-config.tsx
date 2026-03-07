"use client";

import type {
  ParallelSplitBranch,
  ParallelSplitDataDistribution,
  ParallelSplitErrorHandling,
  ParallelSplitExecutionMode,
  ParallelSplitNodeConfig,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback, useEffect, useMemo } from "react";
import { cn } from "../../../../utils";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Button } from "../../../button";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { SelectionCard } from "../../../selection-card";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

const EXECUTION_MODES: Array<{
  id: ParallelSplitExecutionMode;
  name: string;
  description: string;
  iconName: "GitFork" | "ArrowRight";
}> = [
  {
    id: "parallel",
    name: "Parallel",
    description: "All outputs execute concurrently",
    iconName: "GitFork",
  },
  {
    id: "sequential",
    name: "Sequential",
    description: "Outputs execute one at a time",
    iconName: "ArrowRight",
  },
];

const DATA_DISTRIBUTION_OPTIONS: Array<{
  id: ParallelSplitDataDistribution;
  name: string;
  description: string;
  iconName: keyof typeof Icons;
}> = [
  {
    id: "broadcast",
    name: "Broadcast",
    description: "Same data sent to all outputs",
    iconName: "Copy",
  },
  {
    id: "roundRobin",
    name: "Round Robin",
    description: "Distribute items cyclically",
    iconName: "RefreshCw",
  },
  {
    id: "partition",
    name: "Partition",
    description: "Split by key expression",
    iconName: "Scissors",
  },
];

const ERROR_HANDLING_OPTIONS: Array<{
  id: ParallelSplitErrorHandling;
  name: string;
  description: string;
}> = [
  {
    id: "failFast",
    name: "Fail Fast",
    description: "Stop all on first error",
  },
  {
    id: "continueOnError",
    name: "Continue",
    description: "Let others complete",
  },
  {
    id: "collectErrors",
    name: "Collect",
    description: "Aggregate all errors",
  },
];

const OUTPUT_COUNT_RANGE = { min: 2, max: 10 } as const;

interface ParallelSplitConfigPanelProps {
  config: ParallelSplitNodeConfig;
  onChange: (config: Partial<ParallelSplitNodeConfig>) => void;
}

function createBranchId(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function normalizeBranches(
  branches: ParallelSplitBranch[] | undefined,
  count: number
): ParallelSplitBranch[] {
  const base = Array.isArray(branches) ? branches : [];
  const normalized: ParallelSplitBranch[] = [];
  const used = new Set<string>();
  const limit = Math.min(base.length, count);

  for (let i = 0; i < limit; i += 1) {
    const branch = base[i];
    const baseId = branch?.id?.trim() || `output-${i + 1}`;
    const id = createBranchId(baseId, used);
    const label = branch?.label?.trim() || `Output ${i + 1}`;
    normalized.push({ id, label });
  }

  for (let i = normalized.length; i < count; i += 1) {
    const id = createBranchId(`output-${i + 1}`, used);
    normalized.push({ id, label: `Output ${i + 1}` });
  }

  return normalized;
}

function areBranchesEqual(
  left: ParallelSplitBranch[] | undefined,
  right: ParallelSplitBranch[]
): boolean {
  if (!left || left.length !== right.length) {
    return false;
  }
  return left.every(
    (branch, index) =>
      branch.id === right[index]?.id && branch.label === right[index]?.label
  );
}

function getConfigWarnings(params: {
  config: ParallelSplitNodeConfig;
  outputCount: number;
}): string[] {
  const { config, outputCount } = params;
  const result: string[] = [];

  if (config.waitForAll === false) {
    result.push(
      "Engine currently waits for all outputs; toggle is reserved for future behavior"
    );
  }
  if (
    config.executionMode === "parallel" &&
    outputCount > (config.maxConcurrency ?? 10)
  ) {
    result.push(
      `${outputCount} outputs exceed max concurrency of ${config.maxConcurrency ?? 10}`
    );
  }
  if (config.dataDistribution === "partition" && !config.partitionKey) {
    result.push("Partition mode requires a key expression");
  }
  if (
    config.executionMode === "sequential" &&
    (config.maxConcurrency ?? 1) > 1
  ) {
    result.push("Sequential mode enforces a single concurrent branch");
  }
  return result;
}

function getConfigNotes(params: {
  config: ParallelSplitNodeConfig;
  outputCount: number;
}): string[] {
  const { config, outputCount } = params;
  const notes: string[] = [];

  if (config.dataDistribution !== "broadcast") {
    notes.push("Round Robin and Partition require array input");
  }
  if (
    config.executionMode === "parallel" &&
    (config.maxConcurrency ?? outputCount) > outputCount
  ) {
    notes.push("Max concurrency above outputs has no effect");
  }

  return notes;
}

function OutputCountSelector({
  count,
  onChange,
}: {
  count: number;
  onChange: (count: number) => void;
}) {
  const decrement = useCallback(() => {
    if (count > OUTPUT_COUNT_RANGE.min) {
      onChange(count - 1);
    }
  }, [count, onChange]);

  const increment = useCallback(() => {
    if (count < OUTPUT_COUNT_RANGE.max) {
      onChange(count + 1);
    }
  }, [count, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          className="size-10"
          disabled={count <= OUTPUT_COUNT_RANGE.min}
          onClick={decrement}
          size="icon"
          variant="outline"
        >
          <Icons.Minus size={18} />
        </Button>
        <div className="flex min-w-16 flex-col items-center">
          <span className="font-mono font-semibold text-3xl tabular-nums">
            {count}
          </span>
          <span className="text-[10px] text-muted-foreground">outputs</span>
        </div>
        <Button
          className="size-10"
          disabled={count >= OUTPUT_COUNT_RANGE.max}
          onClick={increment}
          size="icon"
          variant="outline"
        >
          <Icons.Plus size={18} />
        </Button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: OUTPUT_COUNT_RANGE.max }, (_, i) => i + 1).map(
          (position) => (
            <button
              className={cn(
                "size-2 rounded-full transition-colors",
                position <= count
                  ? "bg-[hsl(var(--node-parallel))]"
                  : "bg-muted hover:bg-muted-foreground/30"
              )}
              disabled={position < OUTPUT_COUNT_RANGE.min}
              key={position}
              onClick={() => onChange(position)}
              type="button"
            />
          )
        )}
      </div>
    </div>
  );
}

function ExecutionModeSelector({
  executionMode,
  onChange,
}: {
  executionMode: ParallelSplitExecutionMode;
  onChange: (mode: ParallelSplitExecutionMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {EXECUTION_MODES.map((mode) => {
        const Icon = Icons[mode.iconName];
        return (
          <SelectionCard
            className="p-3"
            description={mode.description}
            icon={<Icon size={18} />}
            key={mode.id}
            label={mode.name}
            layout="vertical"
            onClick={() => onChange(mode.id)}
            selected={executionMode === mode.id}
          />
        );
      })}
    </div>
  );
}

function DataDistributionSelector({
  distribution,
  onChange,
}: {
  distribution: ParallelSplitDataDistribution;
  onChange: (mode: ParallelSplitDataDistribution) => void;
}) {
  return (
    <div className="space-y-1.5">
      {DATA_DISTRIBUTION_OPTIONS.map((option) => {
        const isSelected = distribution === option.id;
        const Icon = Icons[option.iconName];
        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border hover:bg-muted/50"
            )}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-md",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
                size={16}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "block font-medium text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {option.name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {option.description}
              </span>
            </div>
            {isSelected && (
              <Icons.Check className="shrink-0 text-primary" size={16} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ErrorHandlingSelector({
  errorHandling,
  onChange,
}: {
  errorHandling: ParallelSplitErrorHandling;
  onChange: (mode: ParallelSplitErrorHandling) => void;
}) {
  return (
    <div className="flex gap-1">
      {ERROR_HANDLING_OPTIONS.map((option) => (
        <SelectionCard
          className="flex-1 px-2 py-2"
          description={option.description}
          key={option.id}
          label={option.name}
          layout="vertical"
          onClick={() => onChange(option.id)}
          selected={errorHandling === option.id}
        />
      ))}
    </div>
  );
}

export const ParallelSplitConfigPanel = memo(
  forwardRef<HTMLDivElement, ParallelSplitConfigPanelProps>(
    function ParallelSplitConfigPanelComponent({ config, onChange }, ref) {
      const baseCount =
        config.branches && config.branches.length > 0
          ? config.branches.length
          : 3;
      const outputCount = Math.min(
        Math.max(baseCount, OUTPUT_COUNT_RANGE.min),
        OUTPUT_COUNT_RANGE.max
      );
      const branches = useMemo(
        () => normalizeBranches(config.branches, outputCount),
        [config.branches, outputCount]
      );
      const executionMode = config.executionMode ?? "parallel";
      const dataDistribution = config.dataDistribution ?? "broadcast";
      const errorHandling = config.errorHandling ?? "failFast";
      const waitForAll = config.waitForAll ?? true;
      const partitionKeyMissing =
        dataDistribution === "partition" && !config.partitionKey?.trim();

      useEffect(() => {
        if (!areBranchesEqual(config.branches, branches)) {
          onChange({ branches });
        }
      }, [branches, config.branches, onChange]);

      const warnings = useMemo(
        () => getConfigWarnings({ config, outputCount }),
        [config, outputCount]
      );
      const notes = useMemo(
        () => getConfigNotes({ config, outputCount }),
        [config, outputCount]
      );

      const handleOutputCountChange = useCallback(
        (count: number) => {
          if (
            count < OUTPUT_COUNT_RANGE.min ||
            count > OUTPUT_COUNT_RANGE.max
          ) {
            return;
          }
          onChange({ branches: normalizeBranches(branches, count) });
        },
        [branches, onChange]
      );

      const handleLabelChange = useCallback(
        (index: number, value: string) => {
          const nextLabel = value.trim() || `Output ${index + 1}`;
          const nextBranches = branches.map((branch, idx) =>
            idx === index ? { ...branch, label: nextLabel } : branch
          );
          onChange({ branches: nextBranches });
        },
        [branches, onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.GitFork size={16} />}
            title="Outputs"
          >
            <div className="space-y-4">
              <OutputCountSelector
                count={outputCount}
                onChange={handleOutputCountChange}
              />
              <ConfigField
                label="Output Labels"
                tooltip="Labels are used to identify each branch"
              >
                <div className="space-y-2">
                  {branches.map((branch, index) => (
                    <div className="flex items-center gap-2" key={branch.id}>
                      <Input
                        className="h-9"
                        onChange={(e) =>
                          handleLabelChange(index, e.target.value)
                        }
                        value={branch.label}
                      />
                      <span className="w-20 truncate text-[10px] text-muted-foreground">
                        {branch.id}
                      </span>
                    </div>
                  ))}
                </div>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Zap size={16} />}
            title="Execution"
          >
            <div className="space-y-4">
              <ExecutionModeSelector
                executionMode={executionMode}
                onChange={(mode) => onChange({ executionMode: mode })}
              />

              <AnimatedSizeContainer height>
                {executionMode === "parallel" && (
                  <ConfigField
                    label="Max Concurrency"
                    tooltip="Maximum outputs running simultaneously"
                  >
                    <div className="flex items-center gap-4">
                      <Slider
                        className="flex-1"
                        max={100}
                        min={1}
                        onValueChange={(v) =>
                          onChange({ maxConcurrency: v[0] })
                        }
                        step={1}
                        value={[config.maxConcurrency ?? 10]}
                      />
                      <span className="w-8 text-right font-mono text-sm tabular-nums">
                        {config.maxConcurrency ?? 10}
                      </span>
                    </div>
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Copy size={16} />}
            title="Distribution"
          >
            <div className="space-y-4">
              <DataDistributionSelector
                distribution={dataDistribution}
                onChange={(mode) => onChange({ dataDistribution: mode })}
              />

              <AnimatedSizeContainer height>
                {dataDistribution === "partition" && (
                  <ConfigField
                    error={
                      partitionKeyMissing
                        ? "Partition key expression is required"
                        : undefined
                    }
                    label="Partition Key"
                    required
                    tooltip="Expression to route items to outputs"
                  >
                    <Input
                      className="h-9 font-mono text-sm"
                      onChange={(e) =>
                        onChange({ partitionKey: e.target.value })
                      }
                      placeholder="item.category"
                      value={config.partitionKey ?? ""}
                    />
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Clock size={16} />}
            title="Sync & Errors"
          >
            <div className="space-y-4">
              <ConfigField
                horizontal
                label="Wait for all"
                tooltip="Currently enforced by the execution engine"
              >
                <Switch checked={waitForAll} disabled />
              </ConfigField>

              <AnimatedSizeContainer height>
                {waitForAll && (
                  <ConfigField
                    label="Timeout"
                    tooltip="Max wait time (optional)"
                  >
                    <Input
                      className="h-9 font-mono"
                      min={0}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value, 10);
                        onChange({ timeoutMs: val > 0 ? val : undefined });
                      }}
                      placeholder="No timeout"
                      type="number"
                      value={config.timeoutMs ?? ""}
                    />
                  </ConfigField>
                )}
              </AnimatedSizeContainer>

              <ConfigField label="On Error">
                <ErrorHandlingSelector
                  errorHandling={errorHandling}
                  onChange={(mode) => onChange({ errorHandling: mode })}
                />
              </ConfigField>

              <WarningsList items={warnings} />
              <NotesList items={notes} />
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ParallelSplitConfigPanel.displayName = "ParallelSplitConfigPanel";
