"use client";

import type {
  ParameterBinding,
  ToolNodeConfig,
  ToolRetryConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import {
  ParameterBindingEditor,
  type ToolParameterDef,
  ToolPicker,
  type ToolPickerItem,
} from "../../tool-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

const TIMEOUT_STEPS = [5, 10, 15, 30, 60, 120, 300];
const VARIABLE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function msToStepIndex(ms: number): number {
  const seconds = ms / 1000;
  const idx = TIMEOUT_STEPS.findIndex((s) => s >= seconds);
  return idx === -1 ? TIMEOUT_STEPS.length - 1 : idx;
}

function stepIndexToMs(idx: number): number {
  return (TIMEOUT_STEPS[idx] ?? 30) * 1000;
}

function buildWarnings(config: ToolNodeConfig): string[] {
  const warnings: string[] = [];
  if (!config.toolId?.trim()) {
    warnings.push("Tool ID is required");
  }
  if (config.resultPath?.trim()) {
    const path = config.resultPath.trim();
    if (path.startsWith("$")) {
      warnings.push("Result path should not include a $ prefix");
    }
  }
  if (config.resultVariable?.trim()) {
    const variable = config.resultVariable.trim();
    const match = variable.match(VARIABLE_NAME_REGEX);
    if (!match) {
      warnings.push("Variable name must be a valid identifier");
    }
  }
  return warnings;
}

function buildNotes(config: ToolNodeConfig): string[] {
  const notes: string[] = [];
  const bindings = config.parameterBindings ?? {};
  const bindingEntries = Object.values(bindings);
  const retryConfig = config.retryConfig;

  if (bindingEntries.length === 0) {
    notes.push("Input payload is passed directly to the tool");
  }

  const aiCount = bindingEntries.filter((b) => b.mode === "ai_inferred").length;
  if (aiCount > 0) {
    notes.push(`AI infers ${aiCount} parameter${aiCount > 1 ? "s" : ""}`);
  }

  if (retryConfig?.enabled) {
    notes.push(`Retry up to ${retryConfig.maxAttempts}x`);
  }

  if (config.timeoutMs) {
    notes.push(`Timeout ${config.timeoutMs / 1000}s`);
  }

  if (config.continueOnError) {
    notes.push("Continue on error enabled");
  }

  if (config.resultPath?.trim()) {
    notes.push("Result path extracts data from tool output");
  }

  if (config.resultVariable?.trim()) {
    notes.push("Result is stored in a variable");
  }

  return notes;
}

interface ToolConfigPanelProps {
  config: ToolNodeConfig;
  onChange: (config: Partial<ToolNodeConfig>) => void;
  availableTools?: ToolPickerItem[];
  toolParameters?: ToolParameterDef[];
  toolParametersLoading?: boolean;
}

function ToolSelectionContent({
  availableTools,
  selectedToolId,
  onToolSelect,
  onToolIdChange,
}: {
  availableTools: ToolPickerItem[] | undefined;
  selectedToolId: string;
  onToolSelect: (toolId: string) => void;
  onToolIdChange: (toolId: string) => void;
}) {
  if (availableTools === undefined) {
    return (
      <div className="space-y-3 py-2">
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" />
        <ConfigField label="Tool ID">
          <Input
            className="h-8 font-mono text-xs"
            onChange={(e) => onToolIdChange(e.target.value)}
            placeholder="e.g. search_hybrid"
            value={selectedToolId}
          />
        </ConfigField>
      </div>
    );
  }

  if (availableTools.length > 0) {
    return (
      <ConfigField label="Tool">
        <ToolPicker
          onSelect={onToolSelect}
          selectedToolId={selectedToolId}
          tools={availableTools}
        />
      </ConfigField>
    );
  }

  return (
    <ConfigField label="Tool ID">
      <Input
        className="h-8 font-mono text-xs"
        onChange={(e) => onToolIdChange(e.target.value)}
        placeholder="e.g. search_hybrid"
        value={selectedToolId}
      />
    </ConfigField>
  );
}

export const ToolConfigPanel = memo(
  forwardRef<HTMLDivElement, ToolConfigPanelProps>(
    function ToolConfigPanelComponent(
      {
        config,
        onChange,
        availableTools,
        toolParameters,
        toolParametersLoading,
      },
      ref
    ) {
      const bindings = config.parameterBindings ?? {};
      const retryConfig: ToolRetryConfig = useMemo(
        () =>
          config.retryConfig ?? {
            enabled: false,
            maxAttempts: 3,
            backoffMs: 1000,
            exponential: true,
          },
        [config.retryConfig]
      );

      const handleToolSelect = useCallback(
        (toolId: string) => {
          const tool = availableTools?.find((t) => t.id === toolId);
          onChange({
            toolId,
            toolCategory: tool?.category,
            parameterBindings: {},
          });
        },
        [availableTools, onChange]
      );

      const handleBindingsChange = useCallback(
        (parameterBindings: Record<string, ParameterBinding>) =>
          onChange({ parameterBindings }),
        [onChange]
      );

      const handleRetryChange = useCallback(
        (patch: Partial<ToolRetryConfig>) =>
          onChange({ retryConfig: { ...retryConfig, ...patch } }),
        [onChange, retryConfig]
      );

      const handleTimeoutChange = useCallback(
        (value: number[]) => {
          const idx = value[0];
          if (idx !== undefined) {
            onChange({ timeoutMs: stepIndexToMs(idx) });
          }
        },
        [onChange]
      );

      const timeoutIndex = useMemo(
        () => msToStepIndex(config.timeoutMs ?? 30_000),
        [config.timeoutMs]
      );

      const timeoutLabel = useMemo(() => {
        const s = (config.timeoutMs ?? 30_000) / 1000;
        return s >= 60 ? `${s / 60}m` : `${s}s`;
      }, [config.timeoutMs]);

      const parameterDefs = toolParameters ?? [];

      const selectedToolDescription = useMemo(() => {
        if (!(config.toolId && availableTools)) {
          return;
        }
        return availableTools.find((t) => t.id === config.toolId)?.description;
      }, [config.toolId, availableTools]);

      const paramBadge = useMemo(() => {
        const count = Object.keys(bindings).length;
        return count > 0 ? `${count}` : undefined;
      }, [bindings]);

      const outputBadge = useMemo(
        () => (config.resultPath ? "mapped" : undefined),
        [config.resultPath]
      );
      const warnings = useMemo(() => buildWarnings(config), [config]);
      const notes = useMemo(() => buildNotes(config), [config]);

      return (
        <div
          className="min-w-0 divide-y divide-border/50 overflow-hidden"
          ref={ref}
        >
          <ConfigSection
            defaultOpen
            icon={<Icons.Wrench className="size-4" />}
            title="Tool Selection"
          >
            <ToolSelectionContent
              availableTools={availableTools}
              onToolIdChange={(toolId) => onChange({ toolId })}
              onToolSelect={handleToolSelect}
              selectedToolId={config.toolId}
            />
            {selectedToolDescription && (
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                {selectedToolDescription}
              </p>
            )}
          </ConfigSection>

          <ConfigSection
            badge={paramBadge}
            defaultOpen={!!config.toolId}
            icon={<Icons.Settings2 className="size-4" />}
            title="Parameters"
          >
            {toolParametersLoading && config.toolId && (
              <div className="space-y-3 py-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    className="space-y-2"
                    key={`param-skeleton-${String(i)}`}
                  >
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-8 animate-pulse rounded-md bg-muted" />
                  </div>
                ))}
              </div>
            )}
            {!toolParametersLoading && parameterDefs.length > 0 && (
              <ParameterBindingEditor
                bindings={bindings}
                onChange={handleBindingsChange}
                parameters={parameterDefs}
              />
            )}
            {!toolParametersLoading &&
              parameterDefs.length === 0 &&
              config.toolId && (
                <p className="py-4 text-center text-muted-foreground/60 text-xs">
                  No parameter definitions available
                </p>
              )}
            {!config.toolId && (
              <p className="py-4 text-center text-muted-foreground/60 text-xs">
                Select a tool to configure parameters
              </p>
            )}
          </ConfigSection>

          <ConfigSection
            badge={outputBadge}
            defaultOpen={false}
            icon={<Icons.ArrowRight className="size-4" />}
            title="Output Mapping"
          >
            <div className="space-y-4">
              <ConfigField
                label="Result Path"
                tooltip="JSONPath to extract from tool output"
              >
                <Input
                  className="h-8 font-mono text-xs"
                  onChange={(e) =>
                    onChange({ resultPath: e.target.value || undefined })
                  }
                  placeholder="data.results"
                  value={config.resultPath ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="Variable Name"
                tooltip="Store result in named variable"
              >
                <Input
                  className="h-8 font-mono text-xs"
                  onChange={(e) =>
                    onChange({ resultVariable: e.target.value || undefined })
                  }
                  placeholder="tool_result"
                  value={config.resultVariable ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Play className="size-4" />}
            title="Execution"
          >
            <div className="space-y-4">
              <ConfigField
                label="Timeout"
                tooltip="Maximum wait time for tool execution"
              >
                <div className="flex items-center gap-3">
                  <Slider
                    max={TIMEOUT_STEPS.length - 1}
                    min={0}
                    onValueChange={handleTimeoutChange}
                    step={1}
                    value={[timeoutIndex]}
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-muted-foreground text-xs">
                    {timeoutLabel}
                  </span>
                </div>
              </ConfigField>

              <ConfigField horizontal label="Retry">
                <Switch
                  checked={retryConfig.enabled}
                  onCheckedChange={(v) => handleRetryChange({ enabled: v })}
                />
              </ConfigField>

              {retryConfig.enabled && (
                <div className="space-y-4 border-border/30 border-l-2 pl-2">
                  <ConfigField label="Max Attempts">
                    <Input
                      className="h-8 font-mono text-xs"
                      max={10}
                      min={1}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(n)) {
                          handleRetryChange({
                            maxAttempts: Math.min(10, Math.max(1, n)),
                          });
                        }
                      }}
                      type="number"
                      value={retryConfig.maxAttempts}
                    />
                  </ConfigField>

                  <ConfigField label="Backoff (ms)">
                    <Input
                      className="h-8 font-mono text-xs"
                      min={100}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(n)) {
                          handleRetryChange({
                            backoffMs: Math.max(100, n),
                          });
                        }
                      }}
                      type="number"
                      value={retryConfig.backoffMs}
                    />
                  </ConfigField>

                  <ConfigField horizontal label="Exponential">
                    <Switch
                      checked={retryConfig.exponential}
                      onCheckedChange={(v) =>
                        handleRetryChange({ exponential: v })
                      }
                    />
                  </ConfigField>
                </div>
              )}

              <ConfigField horizontal label="Continue on Error">
                <Switch
                  checked={config.continueOnError ?? false}
                  onCheckedChange={(v) => onChange({ continueOnError: v })}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <WarningsList items={warnings} />
          <NotesList items={notes} />
        </div>
      );
    }
  )
);

ToolConfigPanel.displayName = "ToolConfigPanel";
