"use client";

import type {
  LoopErrorHandling,
  LoopExecutionMode,
  LoopNodeConfig,
  LoopOutputMode,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useEffect, useMemo } from "react";
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
import { SelectionCard } from "../../../selection-card";
import { Slider } from "../../../slider";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { WarningsList } from "../feedback-lists";

const LOOP_TYPES = [
  { id: "forEach", name: "For Each", description: "Iterate over array items" },
  { id: "while", name: "While", description: "Loop while condition is true" },
  { id: "times", name: "Times", description: "Fixed number of iterations" },
] as const;

const EXECUTION_MODES: Array<{
  id: LoopExecutionMode;
  name: string;
  description: string;
  iconName: "ArrowRight" | "GitFork" | "Layers";
}> = [
  {
    id: "sequential",
    name: "Sequential",
    description: "One item at a time, in order",
    iconName: "ArrowRight",
  },
  {
    id: "parallel",
    name: "Parallel",
    description: "All items simultaneously",
    iconName: "GitFork",
  },
  {
    id: "batch",
    name: "Batch",
    description: "Groups of items in parallel",
    iconName: "Layers",
  },
];

const ERROR_HANDLING_OPTIONS: Array<{
  id: LoopErrorHandling;
  name: string;
  description: string;
}> = [
  { id: "stop", name: "Stop", description: "Halt on first error" },
  { id: "continue", name: "Continue", description: "Skip failed items" },
  {
    id: "collect",
    name: "Collect",
    description: "Continue and collect errors",
  },
];

const OUTPUT_MODE_OPTIONS: Array<{
  id: LoopOutputMode;
  name: string;
  description: string;
}> = [
  {
    id: "all",
    name: "All Results",
    description: "Array of all iteration outputs",
  },
  {
    id: "lastOnly",
    name: "Last Only",
    description: "Only the final iteration",
  },
  {
    id: "aggregate",
    name: "Aggregate",
    description: "Custom aggregation expression",
  },
];

interface LoopConfigPanelProps {
  config: LoopNodeConfig;
  onChange: (config: Partial<LoopNodeConfig>) => void;
}

function getConfigWarnings(
  config: LoopNodeConfig,
  executionMode: LoopExecutionMode
): string[] {
  const result: string[] = [];
  if (executionMode !== "sequential") {
    result.push("Only sequential execution is supported right now");
  }
  if (executionMode === "parallel" && (config.times ?? 0) > 50) {
    result.push("High parallel count may impact performance");
  }
  if (executionMode === "batch" && (config.batchSize ?? 10) > 100) {
    result.push("Large batch size may cause memory issues");
  }
  if (config.type === "while" && !config.breakCondition) {
    result.push("While loops should have a break condition");
  }
  if ((config.maxIterations ?? 100) > 1000) {
    result.push("High iteration limit may indicate an issue");
  }
  return result;
}

function BatchConfigFields({
  config,
  onChange,
}: {
  config: LoopNodeConfig;
  onChange: (config: Partial<LoopNodeConfig>) => void;
}) {
  return (
    <>
      <ConfigField label="Batch Size" tooltip="Number of items per batch">
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            max={100}
            min={1}
            onValueChange={(v) => onChange({ batchSize: v[0] })}
            step={1}
            value={[config.batchSize ?? 10]}
          />
          <span className="w-8 text-right font-mono text-sm tabular-nums">
            {config.batchSize ?? 10}
          </span>
        </div>
      </ConfigField>
      <ConfigField label="Batch Delay" tooltip="Delay between batches (ms)">
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            max={5000}
            min={0}
            onValueChange={(v) => onChange({ batchDelayMs: v[0] })}
            step={100}
            value={[config.batchDelayMs ?? 0]}
          />
          <span className="w-14 text-right font-mono text-sm tabular-nums">
            {config.batchDelayMs ?? 0}ms
          </span>
        </div>
      </ConfigField>
    </>
  );
}

function LoopTypeFields({
  config,
  onChange,
}: {
  config: LoopNodeConfig;
  onChange: (config: Partial<LoopNodeConfig>) => void;
}) {
  if (config.type === "forEach") {
    const hasError = !config.collection?.trim();
    return (
      <ConfigField
        error={hasError ? "Collection is required" : undefined}
        label="Collection"
        tooltip="JavaScript expression. Use input/data (e.g. input.items)"
      >
        <Input
          className="h-9 font-mono text-sm"
          onChange={(e) => onChange({ collection: e.target.value })}
          placeholder="input.items"
          value={config.collection ?? ""}
        />
      </ConfigField>
    );
  }
  if (config.type === "while") {
    const hasError = !config.condition?.trim();
    return (
      <ConfigField
        error={hasError ? "Condition is required" : undefined}
        label="Condition"
        tooltip="JavaScript expression. Available: item, index, iteration, lastOutput, results, errors, initialInput"
      >
        <Input
          className="h-9 font-mono text-sm"
          onChange={(e) => onChange({ condition: e.target.value })}
          placeholder="index < 10 && !done"
          value={config.condition ?? ""}
        />
      </ConfigField>
    );
  }
  if (config.type === "times") {
    const hasError = !(config.times && config.times > 0);
    return (
      <ConfigField
        error={hasError ? "Iterations must be at least 1" : undefined}
        label="Iterations"
      >
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            max={100}
            min={1}
            onValueChange={(v) => onChange({ times: v[0] })}
            step={1}
            value={[config.times ?? 10]}
          />
          <span className="w-8 text-right font-mono text-sm tabular-nums">
            {config.times ?? 10}
          </span>
        </div>
      </ConfigField>
    );
  }
  return null;
}

function ExecutionModeSelector({
  executionMode,
  onChange,
}: {
  executionMode: LoopExecutionMode;
  onChange: (mode: LoopExecutionMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {EXECUTION_MODES.map((mode) => {
        const Icon = Icons[mode.iconName];
        const isSupported = mode.id === "sequential";
        const description = isSupported
          ? mode.description
          : `${mode.description} (not supported yet)`;
        return (
          <SelectionCard
            className="p-2"
            description={description}
            disabled={!isSupported}
            icon={<Icon size={16} />}
            key={mode.id}
            label={mode.name}
            layout="vertical"
            onClick={() => onChange(mode.id)}
            selected={executionMode === mode.id}
            size="sm"
            title={isSupported ? undefined : "Not supported yet"}
          />
        );
      })}
    </div>
  );
}

export const LoopConfigPanel = memo(
  forwardRef<HTMLDivElement, LoopConfigPanelProps>(
    function LoopConfigPanelComponent({ config, onChange }, ref) {
      const executionMode = config.executionMode ?? "sequential";
      const showBatchConfig = executionMode === "batch";
      const missingAggregateExpression =
        config.outputMode === "aggregate" &&
        !config.aggregateExpression?.trim();
      const warnings = useMemo(
        () => getConfigWarnings(config, executionMode),
        [config, executionMode]
      );

      useEffect(() => {
        if (config.executionMode && config.executionMode !== "sequential") {
          onChange({ executionMode: "sequential" });
        }
      }, [config.executionMode, onChange]);

      useEffect(() => {
        if (config.type === "times" && !(config.times && config.times > 0)) {
          onChange({ times: 10 });
        }
      }, [config.type, config.times, onChange]);

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.RefreshCw size={16} />}
            title="Loop Type"
          >
            <div className="space-y-4">
              <ConfigField label="Type" required>
                <Select
                  onValueChange={(type) =>
                    onChange({ type: type as LoopNodeConfig["type"] })
                  }
                  value={config.type ?? "forEach"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOOP_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className="flex items-center gap-2">
                          <span>{type.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {type.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
              <LoopTypeFields config={config} onChange={onChange} />
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Zap size={16} />}
            title="Execution"
          >
            <div className="space-y-4">
              <ConfigField label="Mode" tooltip="How iterations are executed">
                <ExecutionModeSelector
                  executionMode={executionMode}
                  onChange={(mode) => onChange({ executionMode: mode })}
                />
              </ConfigField>

              <AnimatedSizeContainer height>
                {showBatchConfig && (
                  <BatchConfigFields config={config} onChange={onChange} />
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.AlertTriangle size={16} />}
            title="Error Handling"
          >
            <div className="space-y-4">
              <ConfigField
                label="On Error"
                tooltip="How to handle iteration failures"
              >
                <Select
                  onValueChange={(mode) =>
                    onChange({ errorHandling: mode as LoopErrorHandling })
                  }
                  value={config.errorHandling ?? "stop"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ERROR_HANDLING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        <span className="flex items-center gap-2">
                          <span>{opt.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {opt.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.LogOut size={16} />}
            title="Break Condition"
          >
            <div className="space-y-4">
              <ConfigField
                label="Expression"
                tooltip="JavaScript expression. Available: item, index, iteration, lastOutput, results, errors, initialInput"
              >
                <Input
                  className="h-9 font-mono text-sm"
                  onChange={(e) => onChange({ breakCondition: e.target.value })}
                  placeholder="item.status === 'complete'"
                  value={config.breakCondition ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.FileExport size={16} />}
            title="Output"
          >
            <div className="space-y-4">
              <ConfigField
                label="Output Mode"
                tooltip="How to collect iteration results"
              >
                <Select
                  onValueChange={(mode) =>
                    onChange({ outputMode: mode as LoopOutputMode })
                  }
                  value={config.outputMode ?? "all"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        <span className="flex items-center gap-2">
                          <span>{opt.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {opt.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <AnimatedSizeContainer height>
                {config.outputMode === "aggregate" && (
                  <ConfigField
                    error={
                      missingAggregateExpression
                        ? "Aggregation expression is required"
                        : undefined
                    }
                    label="Aggregation"
                    tooltip="JavaScript expression. Available: results, errors"
                  >
                    <Input
                      className="h-9 font-mono text-sm"
                      onChange={(e) =>
                        onChange({ aggregateExpression: e.target.value })
                      }
                      placeholder="results.reduce((a, b) => a + b, 0)"
                      value={config.aggregateExpression ?? ""}
                    />
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.ShieldIcon size={16} />}
            title="Safety"
            variant={warnings.length > 0 ? "warning" : "default"}
          >
            <div className="space-y-4">
              <ConfigField
                label="Max Iterations"
                tooltip="Safety limit to prevent infinite loops"
              >
                <Input
                  className="h-9 font-mono"
                  max={10_000}
                  min={1}
                  onChange={(e) =>
                    onChange({
                      maxIterations: Number.parseInt(e.target.value, 10) || 100,
                    })
                  }
                  type="number"
                  value={config.maxIterations ?? 100}
                />
              </ConfigField>

              <ConfigField
                label="Timeout"
                tooltip="Maximum execution time (ms)"
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

              <WarningsList items={warnings} />
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

LoopConfigPanel.displayName = "LoopConfigPanel";
