"use client";

import type {
  SubWorkflowInputMode,
  SubWorkflowNodeConfig,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../../../utils";
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
import { NotesList, WarningsList } from "../feedback-lists";

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
    const hasOutputMappings =
      config.outputMappings && Object.keys(config.outputMappings).length > 0;
    const inputMappingsCount = Object.keys(config.inputMappings ?? {}).length;
    const outputMappingsCount = Object.keys(config.outputMappings ?? {}).length;
    const versionError = getVersionError(config.version);

    const warnings = useMemo(() => {
      const list: string[] = [];
      if (!config.workflowId?.trim()) {
        list.push("Workflow ID is required");
      }
      if (versionError) {
        list.push(versionError);
      }
      if (config.inputMode === "fields" && inputMappingsCount === 0) {
        list.push("Input mappings required for Fields mode");
      }
      if (
        config.waitForCompletion &&
        config.timeoutMs !== undefined &&
        config.timeoutMs <= 0
      ) {
        list.push("Timeout must be greater than 0");
      }
      return list;
    }, [
      config.inputMode,
      config.timeoutMs,
      config.waitForCompletion,
      config.workflowId,
      inputMappingsCount,
      versionError,
    ]);

    const notes = useMemo(() => {
      const list: string[] = [];
      if (config.inputMode === "passthrough") {
        list.push("Passes input/context through");
      }
      if (config.inputMode === "json") {
        list.push("JSON mode expects an object payload");
      }
      if (config.waitForCompletion) {
        if (outputMappingsCount > 0) {
          list.push(
            `${outputMappingsCount} output mapping${
              outputMappingsCount > 1 ? "s" : ""
            }`
          );
        } else {
          list.push("No output mappings configured");
        }
      } else {
        list.push("Async returns execution metadata only");
      }
      if (!config.inheritContext) {
        list.push("Context not inherited");
      }
      if (config.retryOnFailure) {
        list.push("Retry is not supported");
      }
      return list;
    }, [
      config.inheritContext,
      config.inputMode,
      config.retryOnFailure,
      config.waitForCompletion,
      outputMappingsCount,
    ]);

    useEffect(() => {
      if (config.retryOnFailure) {
        onChange({ retryOnFailure: false });
      }
    }, [config.retryOnFailure, onChange]);

    useEffect(() => {
      if (
        !config.waitForCompletion &&
        (config.timeoutMs || hasOutputMappings)
      ) {
        onChange({ timeoutMs: undefined, outputMappings: undefined });
      }
    }, [
      config.waitForCompletion,
      config.timeoutMs,
      hasOutputMappings,
      onChange,
    ]);

    return (
      <div className="divide-y divide-border/50">
        <WorkflowSelectionSection config={config} onChange={onChange} />
        <InputConfigSection config={config} onChange={onChange} />
        <ExecutionSection config={config} onChange={onChange} />
        <RetrySection config={config} onChange={onChange} />
        <WarningsList items={warnings} />
        <NotesList items={notes} />
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
    const workflowIdError = config.workflowId.trim().length === 0;
    const versionError = getVersionError(config.version);

    return (
      <ConfigSection
        defaultOpen
        icon={<Icons.Workflow className="size-4" />}
        title="Workflow"
      >
        <div className="space-y-4">
          <ConfigField
            error={workflowIdError ? "Workflow ID is required" : undefined}
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
            error={versionError}
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
  const { rows: inputMappingRows, onRowsChange: handleInputMappingsChange } =
    useMappingRows(config.inputMappings, (inputMappings) =>
      onChange({ inputMappings })
    );
  const inputMappingsCount = useMemo(
    () => inputMappingRows.filter((row) => row.key.trim().length > 0).length,
    [inputMappingRows]
  );
  const handleModeChange = useCallback(
    (inputMode: SubWorkflowInputMode) => {
      onChange({ inputMode });
    },
    [onChange]
  );

  const requiresMappings = config.inputMode === "fields";
  const showMappings = config.inputMode !== "passthrough";
  const mappingError =
    requiresMappings && inputMappingsCount === 0
      ? "Add at least one mapping"
      : undefined;
  const mappingDescription =
    config.inputMode === "fields"
      ? "Required. Map keys to expressions or JSON literals."
      : "Optional. Leave empty to pass input as-is.";

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

        <AnimatedSizeContainer height>
          {showMappings && (
            <ConfigField
              description={`${mappingDescription} Expressions can reference input and context (e.g. {{input.customerId}}, {{context.teamId}}). Values parse JSON when valid; use quotes for strings.`}
              error={mappingError}
              label="Input Mappings"
              required={requiresMappings}
            >
              <MappingEditor
                addLabel="Add mapping"
                keyPlaceholder="field"
                onChange={handleInputMappingsChange}
                rows={inputMappingRows}
                valuePlaceholder="expression or literal"
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>

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
  const { rows: outputMappingRows, onRowsChange: handleOutputMappingsChange } =
    useMappingRows(config.outputMappings, (outputMappings) => {
      const stringMappings: Record<string, string> = {};
      for (const [key, value] of Object.entries(outputMappings)) {
        stringMappings[key] = String(value);
      }
      onChange({ outputMappings: stringMappings });
    });
  const outputMappingsCount = useMemo(
    () => outputMappingRows.filter((row) => row.key.trim().length > 0).length,
    [outputMappingRows]
  );
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

              <ConfigField
                description={
                  "Optional. Map output fields from the sub-workflow response. Expressions evaluate against the sub-workflow output (e.g. {{result}} or $.result)."
                }
                label="Output Mappings"
              >
                <MappingEditor
                  addLabel="Add output mapping"
                  keyPlaceholder="field"
                  onChange={handleOutputMappingsChange}
                  rows={outputMappingRows}
                  valuePlaceholder="expression"
                />
              </ConfigField>
            </div>
          )}
        </AnimatedSizeContainer>

        {!config.waitForCompletion && (
          <div className="rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-muted-foreground text-xs">
            Async mode starts the sub-workflow and returns execution metadata
            only.
          </div>
        )}

        {config.waitForCompletion && outputMappingsCount > 0 && (
          <div className="rounded-md bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
            {outputMappingsCount} output mapping
            {outputMappingsCount === 1 ? "" : "s"} configured
          </div>
        )}
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
      defaultOpen={false}
      icon={<Icons.RefreshCw className="size-4" />}
      title="Retry"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Retry on Failure"
          tooltip="Retries are not supported for sub-workflows yet"
        >
          <Switch
            checked={config.retryOnFailure ?? false}
            disabled
            onCheckedChange={(retryOnFailure) => onChange({ retryOnFailure })}
          />
        </ConfigField>

        <div className="rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
          Retries are enforced at the workflow level. Sub-workflows run once per
          execution.
        </div>
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

function getVersionError(value: string | undefined): string | undefined {
  if (!value) {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "latest") {
    return;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "Use a positive integer or latest";
  }
  return;
}

type MappingRow = {
  key: string;
  value: string;
};

const EXPRESSION_PREFIX = /^\s*(\{\{|\$|\.)/;
const NUMBER_LITERAL_PREFIX = /^-?\d/;

function serializeMappingValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseMappingValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (EXPRESSION_PREFIX.test(trimmed)) {
    return value;
  }
  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith('"') ||
    NUMBER_LITERAL_PREFIX.test(trimmed) ||
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null"
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function mappingsToRows(
  mappings: Record<string, unknown> | undefined
): MappingRow[] {
  if (!mappings) {
    return [];
  }
  return Object.entries(mappings).map(([key, value]) => ({
    key,
    value: serializeMappingValue(value),
  }));
}

function rowsToMappings(rows: MappingRow[]): Record<string, unknown> {
  const mappings: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) {
      continue;
    }
    mappings[key] = parseMappingValue(row.value);
  }
  return mappings;
}

function stringifyMappings(mappings: Record<string, unknown> | undefined) {
  const entries = Object.entries(mappings ?? {})
    .map(([key, value]) => [key, serializeMappingValue(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function useMappingRows(
  mappings: Record<string, unknown> | undefined,
  onChange: (nextMappings: Record<string, unknown>) => void
) {
  const [rows, setRows] = useState<MappingRow[]>(() =>
    mappingsToRows(mappings)
  );

  const incomingSignature = useMemo(
    () => stringifyMappings(mappings),
    [mappings]
  );
  const localSignature = useMemo(
    () => stringifyMappings(rowsToMappings(rows)),
    [rows]
  );

  useEffect(() => {
    if (incomingSignature !== localSignature) {
      setRows(mappingsToRows(mappings));
    }
  }, [incomingSignature, localSignature, mappings]);

  const handleChange = useCallback(
    (nextRows: MappingRow[]) => {
      setRows(nextRows);
      onChange(rowsToMappings(nextRows));
    },
    [onChange]
  );

  return { rows, onRowsChange: handleChange };
}

interface MappingEditorProps {
  rows: MappingRow[];
  onChange: (rows: MappingRow[]) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  maxRows?: number;
}

const MappingEditor = memo(function MappingEditorComponent({
  rows,
  onChange,
  addLabel = "Add mapping",
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  disabled,
  maxRows = 50,
}: MappingEditorProps) {
  const handleAdd = useCallback(() => {
    if (rows.length >= maxRows) {
      return;
    }
    onChange([...rows, { key: "", value: "" }]);
  }, [rows, onChange, maxRows]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(rows.filter((_, i) => i !== index));
    },
    [rows, onChange]
  );

  const handleUpdate = useCallback(
    (index: number, field: keyof MappingRow, value: string) => {
      onChange(
        rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
      );
    },
    [rows, onChange]
  );

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map((row, index) => (
            <div
              className={cn(
                "group flex items-center gap-2",
                disabled && "opacity-50"
              )}
              key={`${index}-${row.key}`}
            >
              <Input
                className="h-8 flex-1 font-mono text-xs"
                disabled={disabled}
                onChange={(e) => handleUpdate(index, "key", e.target.value)}
                placeholder={keyPlaceholder}
                value={row.key}
              />
              <Input
                className="h-8 flex-1 font-mono text-xs"
                disabled={disabled}
                onChange={(e) => handleUpdate(index, "value", e.target.value)}
                placeholder={valuePlaceholder}
                value={row.value}
              />
              <button
                className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive disabled:pointer-events-none group-hover:opacity-100"
                disabled={disabled}
                onClick={() => handleRemove(index)}
                type="button"
              >
                <Icons.Trash className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled || rows.length >= maxRows}
        onClick={handleAdd}
        type="button"
      >
        <Icons.Plus className="size-3" />
        {addLabel}
      </button>
    </div>
  );
});

MappingEditor.displayName = "MappingEditor";
