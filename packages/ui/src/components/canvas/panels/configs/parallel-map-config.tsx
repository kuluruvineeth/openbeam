"use client";

import type {
  ParallelAggregationMode,
  ParallelMapNodeConfig,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface ParallelMapConfigPanelProps {
  config: ParallelMapNodeConfig;
  onChange: (config: Partial<ParallelMapNodeConfig>) => void;
}

type ExecutionMode = "sequential" | "parallel" | "batch";

const EXECUTION_MODES: {
  id: ExecutionMode;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    id: "sequential",
    label: "Sequential",
    description: "Process one at a time",
    icon: "ArrowRight",
  },
  {
    id: "parallel",
    label: "Parallel",
    description: "Process concurrently",
    icon: "GitBranch",
  },
  {
    id: "batch",
    label: "Batch",
    description: "Process in groups",
    icon: "Layers",
  },
];

const AGGREGATION_MODES: {
  id: ParallelAggregationMode;
  label: string;
  description: string;
}[] = [
  { id: "array", label: "Array", description: "Collect results as array" },
  { id: "object", label: "Object", description: "Merge results into object" },
  { id: "merge", label: "Merge", description: "Deep merge all results" },
  {
    id: "custom",
    label: "Custom",
    description: "Custom aggregation expression",
  },
];

const modeCardVariants = cva(
  "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-orchestration)] bg-[var(--node-orchestration)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

function getExecutionMode(config: ParallelMapNodeConfig): ExecutionMode {
  if (config.batchSize !== undefined && config.batchSize > 0) {
    return "batch";
  }
  if ((config.maxConcurrency ?? 10) > 1) {
    return "parallel";
  }
  return "sequential";
}

export const ParallelMapConfigPanel = memo(
  function ParallelMapConfigPanelComponent({
    config,
    onChange,
  }: ParallelMapConfigPanelProps) {
    return (
      <div className="divide-y divide-border/50">
        <CollectionSection config={config} onChange={onChange} />
        <ExecutionSection config={config} onChange={onChange} />
        <ErrorHandlingSection config={config} onChange={onChange} />
        <AggregationSection config={config} onChange={onChange} />
      </div>
    );
  }
);

ParallelMapConfigPanel.displayName = "ParallelMapConfigPanel";

interface SectionProps {
  config: ParallelMapNodeConfig;
  onChange: (config: Partial<ParallelMapNodeConfig>) => void;
}

const CollectionSection = memo(function CollectionSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Database className="size-4" />}
      title="Collection"
    >
      <div className="space-y-4">
        <ConfigField
          label="Collection Path"
          required
          tooltip="Expression that resolves to an array"
        >
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => onChange({ collection: e.target.value })}
            placeholder="{{data.items}}"
            value={config.collection ?? ""}
          />
        </ConfigField>

        <div className="grid grid-cols-2 gap-3">
          <ConfigField
            label="Item Variable"
            tooltip="Name for current item in iteration"
          >
            <Input
              className="h-9 font-mono text-sm"
              onChange={(e) =>
                onChange({ itemVariable: e.target.value || "item" })
              }
              placeholder="item"
              value={config.itemVariable ?? "item"}
            />
          </ConfigField>

          <ConfigField
            label="Index Variable"
            tooltip="Name for current index in iteration"
          >
            <Input
              className="h-9 font-mono text-sm"
              onChange={(e) =>
                onChange({ indexVariable: e.target.value || "index" })
              }
              placeholder="index"
              value={config.indexVariable ?? "index"}
            />
          </ConfigField>
        </div>
      </div>
    </ConfigSection>
  );
});

const ExecutionSection = memo(function ExecutionSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const currentMode = getExecutionMode(config);

  const handleModeChange = useCallback(
    (mode: ExecutionMode) => {
      switch (mode) {
        case "sequential":
          onChange({ maxConcurrency: 1, batchSize: undefined });
          break;
        case "parallel":
          onChange({ maxConcurrency: 10, batchSize: undefined });
          break;
        case "batch":
          onChange({ maxConcurrency: 1, batchSize: 5 });
          break;
        default:
          break;
      }
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={currentMode}
      defaultOpen
      icon={<Icons.Zap className="size-4" />}
      title="Execution"
    >
      <div className="space-y-4">
        <ConfigField label="Mode" tooltip="How to process items">
          <div className="grid grid-cols-3 gap-2">
            {EXECUTION_MODES.map((mode) => {
              const Icon = Icons[mode.icon];
              return (
                <button
                  className={modeCardVariants({
                    selected: currentMode === mode.id,
                  })}
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="font-medium text-xs">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </ConfigField>

        <AnimatedSizeContainer height>
          {currentMode === "parallel" && (
            <ConfigField
              label="Max Concurrency"
              tooltip="Maximum parallel executions"
            >
              <div className="flex items-center gap-4">
                <Slider
                  className="flex-1"
                  max={50}
                  min={2}
                  onValueChange={(v) =>
                    onChange({ maxConcurrency: v[0] ?? 10 })
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

        <AnimatedSizeContainer height>
          {currentMode === "batch" && (
            <div className="space-y-4">
              <ConfigField label="Batch Size" tooltip="Items per batch">
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={100}
                    min={1}
                    onValueChange={(v) => onChange({ batchSize: v[0] ?? 5 })}
                    step={1}
                    value={[config.batchSize ?? 5]}
                  />
                  <span className="w-8 text-right font-mono text-sm tabular-nums">
                    {config.batchSize ?? 5}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Batch Delay"
                tooltip="Milliseconds to wait between batches"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={5000}
                    min={0}
                    onValueChange={(v) => onChange({ batchDelayMs: v[0] ?? 0 })}
                    step={100}
                    value={[config.batchDelayMs ?? 0]}
                  />
                  <span className="w-14 text-right font-mono text-sm tabular-nums">
                    {config.batchDelayMs ?? 0}ms
                  </span>
                </div>
              </ConfigField>
            </div>
          )}
        </AnimatedSizeContainer>

        <ConfigField label="Timeout (ms)" tooltip="Per-item timeout">
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => {
              const value = e.target.value;
              onChange({
                timeout: value ? Number(value) : undefined,
              });
            }}
            placeholder="No timeout"
            type="number"
            value={config.timeout ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const ErrorHandlingSection = memo(function ErrorHandlingSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      badge={config.continueOnError ? "Continue" : "Stop"}
      defaultOpen={false}
      icon={<Icons.AlertCircle className="size-4" />}
      title="Error Handling"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Continue on Error"
          tooltip="Keep processing remaining items if one fails"
        >
          <Switch
            checked={config.continueOnError ?? false}
            onCheckedChange={(continueOnError) => onChange({ continueOnError })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {config.continueOnError && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2">
              <div className="flex items-start gap-2">
                <Icons.AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="text-muted-foreground text-xs">
                  Failed items will be included in results with error details.
                  Check each result for success status.
                </div>
              </div>
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

const AggregationSection = memo(function AggregationSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      badge={config.aggregationMode ?? "array"}
      defaultOpen={false}
      icon={<Icons.GitMerge className="size-4" />}
      title="Aggregation"
    >
      <div className="space-y-4">
        <ConfigField label="Mode" tooltip="How to combine results">
          <Select
            onValueChange={(mode) =>
              onChange({ aggregationMode: mode as ParallelAggregationMode })
            }
            value={config.aggregationMode ?? "array"}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATION_MODES.map((mode) => (
                <SelectItem key={mode.id} value={mode.id}>
                  <div className="flex flex-col">
                    <span>{mode.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {mode.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField
          horizontal
          label="Progress Tracking"
          tooltip="Emit progress events during execution"
        >
          <Switch
            checked={config.progressTracking ?? true}
            onCheckedChange={(progressTracking) =>
              onChange({ progressTracking })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});
