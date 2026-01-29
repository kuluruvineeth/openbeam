"use client";

import type {
  SubWorkflowInputMode,
  SubWorkflowNodeConfig,
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

interface SubWorkflowConfigPanelProps {
  config: SubWorkflowNodeConfig;
  onChange: (config: Partial<SubWorkflowNodeConfig>) => void;
}

const INPUT_MODES: {
  id: SubWorkflowInputMode;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    id: "fields",
    label: "Fields",
    description: "Map individual fields",
    icon: "Table",
  },
  {
    id: "json",
    label: "JSON",
    description: "Pass raw JSON object",
    icon: "Braces",
  },
  {
    id: "passthrough",
    label: "Passthrough",
    description: "Forward all context",
    icon: "ArrowRight",
  },
];

const TIMEOUT_PRESETS = [
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute", value: 60_000 },
  { label: "5 minutes", value: 300_000 },
  { label: "15 minutes", value: 900_000 },
  { label: "30 minutes", value: 1_800_000 },
] as const;

const modeCardVariants = cva(
  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors",
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

export const SubWorkflowConfigPanel = memo(
  function SubWorkflowConfigPanelComponent({
    config,
    onChange,
  }: SubWorkflowConfigPanelProps) {
    return (
      <div className="divide-y divide-border/50">
        <WorkflowSelectionSection config={config} onChange={onChange} />
        <InputConfigSection config={config} onChange={onChange} />
        <ExecutionSection config={config} onChange={onChange} />
        <RetrySection config={config} onChange={onChange} />
      </div>
    );
  }
);

SubWorkflowConfigPanel.displayName = "SubWorkflowConfigPanel";

interface SectionProps {
  config: SubWorkflowNodeConfig;
  onChange: (config: Partial<SubWorkflowNodeConfig>) => void;
}

const WorkflowSelectionSection = memo(
  function WorkflowSelectionSectionComponent({
    config,
    onChange,
  }: SectionProps) {
    return (
      <ConfigSection
        defaultOpen
        icon={<Icons.Workflow className="size-4" />}
        title="Workflow"
      >
        <div className="space-y-4">
          <ConfigField
            label="Workflow ID"
            required
            tooltip="The workflow to execute as a sub-workflow"
          >
            <Input
              className="h-9 font-mono text-sm"
              onChange={(e) => onChange({ workflowId: e.target.value })}
              placeholder="workflow_..."
              value={config.workflowId ?? ""}
            />
          </ConfigField>

          <ConfigField label="Display Name" tooltip="Optional friendly name">
            <Input
              className="h-9"
              onChange={(e) =>
                onChange({ workflowName: e.target.value || undefined })
              }
              placeholder="My Sub-Workflow"
              value={config.workflowName ?? ""}
            />
          </ConfigField>

          <ConfigField
            label="Version"
            tooltip="Specific version to execute, or leave empty for latest"
          >
            <Input
              className="h-9"
              onChange={(e) =>
                onChange({ version: e.target.value || undefined })
              }
              placeholder="latest"
              value={config.version ?? ""}
            />
          </ConfigField>
        </div>
      </ConfigSection>
    );
  }
);

const InputConfigSection = memo(function InputConfigSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleModeChange = useCallback(
    (inputMode: SubWorkflowInputMode) => {
      onChange({ inputMode });
    },
    [onChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Download className="size-4" />}
      title="Input Configuration"
    >
      <div className="space-y-4">
        <ConfigField
          label="Input Mode"
          tooltip="How to pass data to the sub-workflow"
        >
          <div className="space-y-2">
            {INPUT_MODES.map((mode) => {
              const Icon = Icons[mode.icon];
              return (
                <button
                  className={modeCardVariants({
                    selected: config.inputMode === mode.id,
                  })}
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  type="button"
                >
                  <Icon className="size-4 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{mode.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {mode.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ConfigField>

        <ConfigField
          horizontal
          label="Inherit Context"
          tooltip="Pass parent workflow context to sub-workflow"
        >
          <Switch
            checked={config.inheritContext ?? true}
            onCheckedChange={(inheritContext) => onChange({ inheritContext })}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const ExecutionSection = memo(function ExecutionSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const currentTimeout = config.timeoutMs;
  const isCustomTimeout =
    currentTimeout !== undefined &&
    !TIMEOUT_PRESETS.some((p) => p.value === currentTimeout);

  return (
    <ConfigSection
      badge={config.waitForCompletion ? "Sync" : "Async"}
      defaultOpen={false}
      icon={<Icons.Play className="size-4" />}
      title="Execution"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Wait for Completion"
          tooltip="Block until sub-workflow completes"
        >
          <Switch
            checked={config.waitForCompletion ?? true}
            onCheckedChange={(waitForCompletion) =>
              onChange({ waitForCompletion })
            }
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {config.waitForCompletion && (
            <div className="space-y-4">
              <ConfigField label="Timeout" tooltip="Maximum execution time">
                <Select
                  onValueChange={(value) =>
                    onChange({
                      timeoutMs: value === "none" ? undefined : Number(value),
                    })
                  }
                  value={
                    isCustomTimeout
                      ? "custom"
                      : String(currentTimeout ?? "none")
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="No timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No timeout</SelectItem>
                    {TIMEOUT_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.label}
                        value={String(preset.value)}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                    {isCustomTimeout && currentTimeout !== undefined && (
                      <SelectItem value="custom">
                        Custom ({formatTimeout(currentTimeout)})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </ConfigField>

              <AnimatedSizeContainer height>
                {isCustomTimeout && (
                  <ConfigField label="Custom Timeout (seconds)">
                    <div className="flex items-center gap-4">
                      <Slider
                        className="flex-1"
                        max={3600}
                        min={10}
                        onValueChange={(v) =>
                          onChange({ timeoutMs: (v[0] ?? 30) * 1000 })
                        }
                        step={10}
                        value={[Math.round((currentTimeout ?? 30_000) / 1000)]}
                      />
                      <span className="w-14 text-right font-mono text-sm tabular-nums">
                        {Math.round((currentTimeout ?? 30_000) / 1000)}s
                      </span>
                    </div>
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

const RetrySection = memo(function RetrySectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      badge={config.retryOnFailure ? `${config.maxRetries ?? 3}x` : undefined}
      defaultOpen={false}
      icon={<Icons.RefreshCw className="size-4" />}
      title="Retry"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Retry on Failure"
          tooltip="Automatically retry failed executions"
        >
          <Switch
            checked={config.retryOnFailure ?? false}
            onCheckedChange={(retryOnFailure) => onChange({ retryOnFailure })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {config.retryOnFailure && (
            <ConfigField label="Max Retries">
              <div className="flex items-center gap-4">
                <Slider
                  className="flex-1"
                  max={10}
                  min={1}
                  onValueChange={(v) => onChange({ maxRetries: v[0] ?? 3 })}
                  step={1}
                  value={[config.maxRetries ?? 3]}
                />
                <span className="w-8 text-right font-mono text-sm tabular-nums">
                  {config.maxRetries ?? 3}
                </span>
              </div>
            </ConfigField>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

function formatTimeout(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}
