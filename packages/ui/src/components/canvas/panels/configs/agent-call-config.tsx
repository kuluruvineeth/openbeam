"use client";

import type {
  AgentCallNodeConfig,
  AgentExecutionMode,
  AgentOutputFormat,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback, useMemo } from "react";
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
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface AgentCallConfigPanelProps {
  config: AgentCallNodeConfig;
  onChange: (config: Partial<AgentCallNodeConfig>) => void;
}

const EXECUTION_MODES: {
  id: AgentExecutionMode;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    id: "react",
    label: "ReAct",
    description: "Reasoning + Acting loop",
    icon: "BrainIcon",
  },
  {
    id: "sequential",
    label: "Sequential",
    description: "Step-by-step execution",
    icon: "ArrowRight",
  },
  {
    id: "parallel",
    label: "Parallel",
    description: "Multi-path exploration",
    icon: "GitBranch",
  },
  {
    id: "hierarchical",
    label: "Hierarchical",
    description: "Manager-worker delegation",
    icon: "ListTree",
  },
];

const OUTPUT_FORMATS: {
  id: AgentOutputFormat;
  label: string;
  description: string;
}[] = [
  { id: "text", label: "Text", description: "Plain text response" },
  { id: "json", label: "JSON", description: "Structured JSON output" },
  {
    id: "structured",
    label: "Structured",
    description: "Schema-validated output",
  },
];

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

export const AgentCallConfigPanel = memo(
  function AgentCallConfigPanelComponent({
    config,
    onChange,
  }: AgentCallConfigPanelProps) {
    const warnings = useMemo(() => {
      const list: string[] = [];
      if (!config.agentId?.trim()) {
        list.push("Agent ID required");
      }
      if (!config.prompt?.trim()) {
        list.push("Prompt is required");
      }
      const maxSteps = config.maxSteps ?? 10;
      if (maxSteps <= 0) {
        list.push("Max steps must be at least 1");
      }
      const temperature = config.temperature ?? 0.7;
      if (temperature < 0 || temperature > 2) {
        list.push("Temperature must be between 0 and 2");
      }
      const tools = config.tools ?? [];
      if (tools.length > 0 && new Set(tools).size !== tools.length) {
        list.push("Duplicate tools selected");
      }
      return list;
    }, [
      config.agentId,
      config.maxSteps,
      config.prompt,
      config.temperature,
      config.tools,
    ]);

    const notes = useMemo(() => {
      const list: string[] = [];
      if (config.agentName?.trim()) {
        list.push("Display name set");
      }
      if (config.model?.trim()) {
        list.push("Model override set");
      }
      if (config.systemPromptOverride?.trim()) {
        list.push("System prompt override set");
      }
      const toolCount = config.tools?.length ?? 0;
      if (toolCount > 0) {
        list.push(`${toolCount} tool${toolCount > 1 ? "s" : ""} enabled`);
      }
      if (config.memoryEnabled === false) {
        list.push("Memory disabled");
      }
      const executionMode = config.executionMode ?? "react";
      if (executionMode !== "react") {
        const modeLabel =
          EXECUTION_MODES.find((mode) => mode.id === executionMode)?.label ??
          executionMode;
        list.push(`${modeLabel} execution`);
      }
      if (config.outputFormat === "json") {
        list.push("JSON output");
      }
      if (config.outputFormat === "structured") {
        list.push(
          config.stopCondition?.trim()
            ? "Stop condition set"
            : "No stop condition set"
        );
      }
      return list;
    }, [
      config.agentName,
      config.executionMode,
      config.memoryEnabled,
      config.model,
      config.outputFormat,
      config.stopCondition,
      config.systemPromptOverride,
      config.tools?.length,
    ]);

    return (
      <div className="divide-y divide-border/50">
        <AgentSelectionSection config={config} onChange={onChange} />
        <PromptSection config={config} onChange={onChange} />
        <ExecutionModeSection config={config} onChange={onChange} />
        <ModelSection config={config} onChange={onChange} />
        <OutputSection config={config} onChange={onChange} />
        <AdvancedSection config={config} onChange={onChange} />
        <WarningsList items={warnings} />
        <NotesList items={notes} />
      </div>
    );
  }
);

AgentCallConfigPanel.displayName = "AgentCallConfigPanel";

interface SectionProps {
  config: AgentCallNodeConfig;
  onChange: (config: Partial<AgentCallNodeConfig>) => void;
}

const AgentSelectionSection = memo(function AgentSelectionSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.BotIcon className="size-4" />}
      title="Agent"
    >
      <div className="space-y-4">
        <ConfigField label="Agent ID" required tooltip="The agent to execute">
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => onChange({ agentId: e.target.value })}
            placeholder="agent_..."
            value={config.agentId ?? ""}
          />
        </ConfigField>

        <ConfigField label="Display Name" tooltip="Optional friendly name">
          <Input
            className="h-9"
            onChange={(e) =>
              onChange({ agentName: e.target.value || undefined })
            }
            placeholder="Research Agent"
            value={config.agentName ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const PromptSection = memo(function PromptSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.MessageSquare className="size-4" />}
      title="Prompt"
    >
      <div className="space-y-4">
        <ConfigField
          label="Prompt"
          required
          tooltip="The task or question for the agent"
        >
          <Textarea
            className="min-h-[100px] resize-y font-mono text-sm"
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder="Research the latest developments in..."
            value={config.prompt ?? ""}
          />
        </ConfigField>

        <ConfigField
          label="System Prompt Override"
          tooltip="Override the agent's default system prompt"
        >
          <Textarea
            className="min-h-[80px] resize-y font-mono text-sm"
            onChange={(e) =>
              onChange({ systemPromptOverride: e.target.value || undefined })
            }
            placeholder="Optional system prompt override..."
            value={config.systemPromptOverride ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const ExecutionModeSection = memo(function ExecutionModeSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleModeChange = useCallback(
    (executionMode: AgentExecutionMode) => {
      onChange({ executionMode });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={config.executionMode ?? "react"}
      defaultOpen
      icon={<Icons.Zap className="size-4" />}
      title="Execution Mode"
    >
      <div className="space-y-2">
        {EXECUTION_MODES.map((mode) => {
          const Icon = Icons[mode.icon];
          return (
            <button
              className={modeCardVariants({
                selected: (config.executionMode ?? "react") === mode.id,
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
    </ConfigSection>
  );
});

const ModelSection = memo(function ModelSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const temperature = config.temperature ?? 0.7;

  return (
    <ConfigSection
      badge={config.model ?? "default"}
      defaultOpen={false}
      icon={<Icons.BrainIcon className="size-4" />}
      title="Model"
    >
      <div className="space-y-4">
        <ConfigField label="Model" tooltip="LLM model to use">
          <Input
            className="h-9"
            onChange={(e) => onChange({ model: e.target.value || undefined })}
            placeholder="Default model"
            value={config.model ?? ""}
          />
        </ConfigField>

        <ConfigField
          label="Temperature"
          tooltip="Controls randomness (0 = deterministic, 2 = creative)"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={200}
              min={0}
              onValueChange={(v) =>
                onChange({ temperature: (v[0] ?? 70) / 100 })
              }
              step={5}
              value={[Math.round(temperature * 100)]}
            />
            <span className="w-12 text-right font-mono text-sm tabular-nums">
              {temperature.toFixed(2)}
            </span>
          </div>
        </ConfigField>

        <ConfigField label="Max Steps" tooltip="Maximum reasoning/acting steps">
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={50}
              min={1}
              onValueChange={(v) => onChange({ maxSteps: v[0] ?? 10 })}
              step={1}
              value={[config.maxSteps ?? 10]}
            />
            <span className="w-8 text-right font-mono text-sm tabular-nums">
              {config.maxSteps ?? 10}
            </span>
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const OutputSection = memo(function OutputSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      badge={config.outputFormat ?? "text"}
      defaultOpen={false}
      icon={<Icons.FileExport className="size-4" />}
      title="Output"
    >
      <div className="space-y-4">
        <ConfigField
          label="Output Format"
          tooltip="How the agent should format its response"
        >
          <Select
            onValueChange={(format) =>
              onChange({ outputFormat: format as AgentOutputFormat })
            }
            value={config.outputFormat ?? "text"}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_FORMATS.map((format) => (
                <SelectItem key={format.id} value={format.id}>
                  <div className="flex flex-col">
                    <span>{format.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {format.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <AnimatedSizeContainer height>
          {config.outputFormat === "structured" && (
            <ConfigField
              label="Stop Condition"
              tooltip="Expression to determine when agent should stop"
            >
              <Input
                className="h-9 font-mono text-sm"
                onChange={(e) =>
                  onChange({ stopCondition: e.target.value || undefined })
                }
                placeholder="e.g., task_complete === true"
                value={config.stopCondition ?? ""}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

const AdvancedSection = memo(function AdvancedSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Settings2 className="size-4" />}
      title="Advanced"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Memory Enabled"
          tooltip="Allow agent to use long-term memory"
        >
          <Switch
            checked={config.memoryEnabled ?? true}
            onCheckedChange={(memoryEnabled) => onChange({ memoryEnabled })}
          />
        </ConfigField>

        <ConfigField
          label="Tools"
          tooltip="Comma-separated list of tool IDs available to the agent"
        >
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => {
              const value = e.target.value;
              const tools = value
                ? value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : undefined;
              onChange({ tools });
            }}
            placeholder="search, browse, code"
            value={config.tools?.join(", ") ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});
