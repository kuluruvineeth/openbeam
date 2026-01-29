"use client";

import type {
  ParallelSplitDataDistribution,
  ParallelSplitErrorHandling,
  ParallelSplitExecutionMode,
  ParallelSplitNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
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

function getConfigWarnings(config: ParallelSplitNodeConfig): string[] {
  const result: string[] = [];
  const outputCount = config.branches?.length ?? 0;

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
  return result;
}

function generateOutputs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `output-${i + 1}`,
    label: `Output ${i + 1}`,
  }));
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

function WarningsList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <div
          className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs"
          key={warning}
        >
          <Icons.AlertTriangle className="mt-0.5 shrink-0" size={14} />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

export const ParallelSplitConfigPanel = memo(
  forwardRef<HTMLDivElement, ParallelSplitConfigPanelProps>(
    function ParallelSplitConfigPanelComponent({ config, onChange }, ref) {
      const executionMode = config.executionMode ?? "parallel";
      const dataDistribution = config.dataDistribution ?? "broadcast";
      const errorHandling = config.errorHandling ?? "failFast";
      const outputCount = config.branches?.length ?? 3;
      const waitForAll = config.waitForAll ?? true;

      const warnings = useMemo(() => getConfigWarnings(config), [config]);

      const handleOutputCountChange = useCallback(
        (count: number) => {
          if (
            count < OUTPUT_COUNT_RANGE.min ||
            count > OUTPUT_COUNT_RANGE.max
          ) {
            return;
          }
          onChange({ branches: generateOutputs(count) });
        },
        [onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.GitFork size={16} />}
            title="Outputs"
          >
            <OutputCountSelector
              count={outputCount}
              onChange={handleOutputCountChange}
            />
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
                    label="Partition Key"
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
                tooltip="Wait for all outputs to complete"
              >
                <Switch
                  checked={waitForAll}
                  onCheckedChange={(checked) =>
                    onChange({ waitForAll: checked })
                  }
                />
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

              <WarningsList warnings={warnings} />
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ParallelSplitConfigPanel.displayName = "ParallelSplitConfigPanel";
