"use client";

import type {
  ParallelJoinCombineType,
  ParallelJoinEmptyBranchHandling,
  ParallelJoinErrorHandling,
  ParallelJoinMergeStrategy,
  ParallelJoinMode,
  ParallelJoinNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { cn } from "../../../../utils";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Button } from "../../../button";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { SelectionCard } from "../../../selection-card";
import { Slider } from "../../../slider";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const JOIN_MODE_OPTIONS: Array<{
  id: ParallelJoinMode;
  name: string;
  description: string;
  iconName: keyof typeof Icons;
}> = [
  {
    id: "waitForAll",
    name: "Wait All",
    description: "All inputs complete",
    iconName: "Layers",
  },
  {
    id: "pickFirst",
    name: "First",
    description: "Continue on first",
    iconName: "Zap",
  },
  {
    id: "nOutOfM",
    name: "N of M",
    description: "Wait for N inputs",
    iconName: "Users",
  },
];

const MERGE_STRATEGY_OPTIONS: Array<{
  id: ParallelJoinMergeStrategy;
  name: string;
  description: string;
  iconName: keyof typeof Icons;
}> = [
  {
    id: "append",
    name: "Append",
    description: "Concatenate all results into array",
    iconName: "Plus",
  },
  {
    id: "combine",
    name: "Combine",
    description: "SQL-like join on match fields",
    iconName: "GitMerge",
  },
  {
    id: "keepFirst",
    name: "Keep First",
    description: "Use data from first input",
    iconName: "Upload",
  },
  {
    id: "keepLast",
    name: "Keep Last",
    description: "Use data from last input",
    iconName: "Download",
  },
  {
    id: "chooseBranch",
    name: "Choose Branch",
    description: "Use specific input's data",
    iconName: "GitBranch",
  },
];

const COMBINE_TYPE_OPTIONS: Array<{
  id: ParallelJoinCombineType;
  name: string;
  description: string;
}> = [
  { id: "inner", name: "Inner", description: "Only matching records" },
  { id: "left", name: "Left", description: "All from left, matching right" },
  { id: "right", name: "Right", description: "All from right, matching left" },
  { id: "outer", name: "Outer", description: "All records from both" },
];

const EMPTY_HANDLING_OPTIONS: Array<{
  id: ParallelJoinEmptyBranchHandling;
  name: string;
  description: string;
}> = [
  { id: "includeEmpty", name: "Include", description: "Include empty array" },
  { id: "skipEmpty", name: "Skip", description: "Ignore empty branches" },
  { id: "failOnEmpty", name: "Fail", description: "Fail if any empty" },
];

const ERROR_HANDLING_OPTIONS: Array<{
  id: ParallelJoinErrorHandling;
  name: string;
  description: string;
}> = [
  { id: "failFast", name: "Fail Fast", description: "Stop on first error" },
  {
    id: "continueOnError",
    name: "Continue",
    description: "Let others complete",
  },
  { id: "collectErrors", name: "Collect", description: "Aggregate all errors" },
];

const INPUT_COUNT_RANGE = { min: 2, max: 10 } as const;

interface ParallelJoinConfigPanelProps {
  config: ParallelJoinNodeConfig;
  onChange: (config: Partial<ParallelJoinNodeConfig>) => void;
}

function getConfigWarnings(config: ParallelJoinNodeConfig): string[] {
  const result: string[] = [];
  const inputCount = config.inputs?.length ?? 0;

  if (config.joinMode === "nOutOfM") {
    const required = config.requiredCount ?? 0;
    if (required > inputCount) {
      result.push(
        `Required count (${required}) exceeds inputs (${inputCount})`
      );
    }
    if (required < 1) {
      result.push("N of M mode requires at least 1 input");
    }
  }
  if (
    config.mergeStrategy === "combine" &&
    (!config.matchFields || config.matchFields.length === 0)
  ) {
    result.push("Combine strategy requires at least one match field");
  }
  if (config.mergeStrategy === "chooseBranch" && !config.preferredBranch) {
    result.push("Choose Branch requires selecting a preferred input");
  }
  if (
    config.joinMode === "pickFirst" &&
    config.emptyBranchHandling === "failOnEmpty"
  ) {
    result.push("Pick First with Fail On Empty may cause failures");
  }
  return result;
}

function generateInputs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `input-${i + 1}`,
    label: `Input ${i + 1}`,
  }));
}

function InputCountSelector({
  count,
  onChange,
}: {
  count: number;
  onChange: (count: number) => void;
}) {
  const decrement = useCallback(() => {
    if (count > INPUT_COUNT_RANGE.min) {
      onChange(count - 1);
    }
  }, [count, onChange]);

  const increment = useCallback(() => {
    if (count < INPUT_COUNT_RANGE.max) {
      onChange(count + 1);
    }
  }, [count, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          className="size-10"
          disabled={count <= INPUT_COUNT_RANGE.min}
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
          <span className="text-[10px] text-muted-foreground">inputs</span>
        </div>
        <Button
          className="size-10"
          disabled={count >= INPUT_COUNT_RANGE.max}
          onClick={increment}
          size="icon"
          variant="outline"
        >
          <Icons.Plus size={18} />
        </Button>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: INPUT_COUNT_RANGE.max }, (_, i) => i + 1).map(
          (position) => (
            <button
              className={cn(
                "size-2 rounded-full transition-colors",
                position <= count
                  ? "bg-[hsl(var(--node-parallel))]"
                  : "bg-muted hover:bg-muted-foreground/30"
              )}
              disabled={position < INPUT_COUNT_RANGE.min}
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

function JoinModeSelector({
  joinMode,
  onChange,
}: {
  joinMode: ParallelJoinMode;
  onChange: (mode: ParallelJoinMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {JOIN_MODE_OPTIONS.map((option) => {
        const Icon = Icons[option.iconName];
        return (
          <SelectionCard
            className="p-3"
            description={option.description}
            icon={<Icon size={18} />}
            key={option.id}
            label={option.name}
            layout="vertical"
            onClick={() => onChange(option.id)}
            selected={joinMode === option.id}
          />
        );
      })}
    </div>
  );
}

function MergeStrategySelector({
  strategy,
  onChange,
}: {
  strategy: ParallelJoinMergeStrategy;
  onChange: (strategy: ParallelJoinMergeStrategy) => void;
}) {
  return (
    <div className="space-y-1.5">
      {MERGE_STRATEGY_OPTIONS.map((option) => {
        const isSelected = strategy === option.id;
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

function CombineTypeSelector({
  combineType,
  onChange,
}: {
  combineType: ParallelJoinCombineType;
  onChange: (type: ParallelJoinCombineType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {COMBINE_TYPE_OPTIONS.map((option) => (
        <SelectionCard
          className="px-2 py-2"
          description={option.description}
          key={option.id}
          label={option.name}
          layout="vertical"
          onClick={() => onChange(option.id)}
          selected={combineType === option.id}
        />
      ))}
    </div>
  );
}

function EmptyBranchSelector({
  handling,
  onChange,
}: {
  handling: ParallelJoinEmptyBranchHandling;
  onChange: (handling: ParallelJoinEmptyBranchHandling) => void;
}) {
  return (
    <div className="flex gap-1">
      {EMPTY_HANDLING_OPTIONS.map((option) => (
        <SelectionCard
          className="flex-1 px-2 py-2"
          description={option.description}
          key={option.id}
          label={option.name}
          layout="vertical"
          onClick={() => onChange(option.id)}
          selected={handling === option.id}
        />
      ))}
    </div>
  );
}

function ErrorHandlingSelector({
  errorHandling,
  onChange,
}: {
  errorHandling: ParallelJoinErrorHandling;
  onChange: (handling: ParallelJoinErrorHandling) => void;
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

function PreferredBranchSelector({
  inputs,
  preferredBranch,
  onChange,
}: {
  inputs: Array<{ id: string; label: string }>;
  preferredBranch?: string;
  onChange: (branchId: string) => void;
}) {
  return (
    <div className="space-y-1">
      {inputs.map((input) => (
        <button
          aria-pressed={preferredBranch === input.id}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
            preferredBranch === input.id
              ? "border-primary bg-primary/5"
              : "border-border/50 hover:border-border hover:bg-muted/50"
          )}
          key={input.id}
          onClick={() => onChange(input.id)}
          type="button"
        >
          <div
            className={cn(
              "size-2 rounded-full",
              preferredBranch === input.id
                ? "bg-primary"
                : "bg-muted-foreground/30"
            )}
          />
          <span
            className={cn(
              preferredBranch === input.id ? "text-primary" : "text-foreground"
            )}
          >
            {input.label}
          </span>
          {preferredBranch === input.id && (
            <Icons.Check className="ml-auto text-primary" size={14} />
          )}
        </button>
      ))}
    </div>
  );
}

function MatchFieldsEditor({
  fields,
  onChange,
}: {
  fields: Array<{ id: string; left: string; right: string }>;
  onChange: (
    fields: Array<{ id: string; left: string; right: string }>
  ) => void;
}) {
  const addField = useCallback(() => {
    onChange([...fields, { id: crypto.randomUUID(), left: "", right: "" }]);
  }, [fields, onChange]);

  const removeField = useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id));
    },
    [fields, onChange]
  );

  const updateField = useCallback(
    (id: string, side: "left" | "right", value: string) => {
      const updated = fields.map((field) =>
        field.id === id ? { ...field, [side]: value } : field
      );
      onChange(updated);
    },
    [fields, onChange]
  );

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div className="flex items-center gap-2" key={field.id}>
          <Input
            className="h-8 flex-1 font-mono text-xs"
            onChange={(e) => updateField(field.id, "left", e.target.value)}
            placeholder="left.field"
            value={field.left}
          />
          <Icons.LinkIcon
            className="shrink-0 text-muted-foreground"
            size={14}
          />
          <Input
            className="h-8 flex-1 font-mono text-xs"
            onChange={(e) => updateField(field.id, "right", e.target.value)}
            placeholder="right.field"
            value={field.right}
          />
          <Button
            className="size-8 shrink-0"
            onClick={() => removeField(field.id)}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={14} />
          </Button>
        </div>
      ))}
      <Button className="w-full" onClick={addField} size="sm" variant="outline">
        <Icons.Plus size={14} />
        <span>Add Match Field</span>
      </Button>
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

export const ParallelJoinConfigPanel = memo(
  forwardRef<HTMLDivElement, ParallelJoinConfigPanelProps>(
    function ParallelJoinConfigPanelComponent({ config, onChange }, ref) {
      const joinMode = config.joinMode ?? "waitForAll";
      const mergeStrategy = config.mergeStrategy ?? "append";
      const combineType = config.combineType ?? "inner";
      const emptyBranchHandling = config.emptyBranchHandling ?? "includeEmpty";
      const errorHandling = config.errorHandling ?? "failFast";
      const inputCount = config.inputs?.length ?? 2;
      const matchFields = config.matchFields ?? [];

      const warnings = useMemo(() => getConfigWarnings(config), [config]);

      const handleInputCountChange = useCallback(
        (count: number) => {
          if (count < INPUT_COUNT_RANGE.min || count > INPUT_COUNT_RANGE.max) {
            return;
          }
          onChange({ inputs: generateInputs(count) });
        },
        [onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.GitMerge size={16} />}
            title="Inputs"
          >
            <InputCountSelector
              count={inputCount}
              onChange={handleInputCountChange}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Layers size={16} />}
            title="Join Mode"
          >
            <div className="space-y-4">
              <JoinModeSelector
                joinMode={joinMode}
                onChange={(mode) => onChange({ joinMode: mode })}
              />

              <AnimatedSizeContainer height>
                {joinMode === "nOutOfM" && (
                  <ConfigField
                    label="Required Inputs"
                    tooltip="Number of inputs required to continue"
                  >
                    <div className="flex items-center gap-4">
                      <Slider
                        className="flex-1"
                        max={inputCount}
                        min={1}
                        onValueChange={(v) => onChange({ requiredCount: v[0] })}
                        step={1}
                        value={[
                          config.requiredCount ?? Math.ceil(inputCount / 2),
                        ]}
                      />
                      <span className="w-12 text-right font-mono text-sm tabular-nums">
                        {config.requiredCount ?? Math.ceil(inputCount / 2)}/
                        {inputCount}
                      </span>
                    </div>
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Plus size={16} />}
            title="Merge Strategy"
          >
            <div className="space-y-4">
              <MergeStrategySelector
                onChange={(strategy) => onChange({ mergeStrategy: strategy })}
                strategy={mergeStrategy}
              />

              <AnimatedSizeContainer height>
                {mergeStrategy === "combine" && (
                  <div className="space-y-4">
                    <ConfigField label="Combine Type">
                      <CombineTypeSelector
                        combineType={combineType}
                        onChange={(type) => onChange({ combineType: type })}
                      />
                    </ConfigField>
                    <ConfigField
                      label="Match Fields"
                      tooltip="Fields to match between inputs"
                    >
                      <MatchFieldsEditor
                        fields={matchFields}
                        onChange={(fields) => onChange({ matchFields: fields })}
                      />
                    </ConfigField>
                  </div>
                )}
              </AnimatedSizeContainer>

              <AnimatedSizeContainer height>
                {mergeStrategy === "chooseBranch" && (
                  <ConfigField
                    label="Preferred Input"
                    tooltip="Select which input's data to use"
                  >
                    <PreferredBranchSelector
                      inputs={config.inputs ?? generateInputs(inputCount)}
                      onChange={(branchId) =>
                        onChange({ preferredBranch: branchId })
                      }
                      preferredBranch={config.preferredBranch}
                    />
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Clock size={16} />}
            title="Timing & Errors"
          >
            <div className="space-y-4">
              <ConfigField label="Timeout" tooltip="Max wait time (optional)">
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

              <ConfigField label="On Empty Branch">
                <EmptyBranchSelector
                  handling={emptyBranchHandling}
                  onChange={(handling) =>
                    onChange({ emptyBranchHandling: handling })
                  }
                />
              </ConfigField>

              <ConfigField label="On Error">
                <ErrorHandlingSelector
                  errorHandling={errorHandling}
                  onChange={(handling) => onChange({ errorHandling: handling })}
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

ParallelJoinConfigPanel.displayName = "ParallelJoinConfigPanel";
