"use client";

import type {
  CodeNodeConfig,
  CodeRuntime,
  InputVariable,
  OutputField,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { CodeEditor } from "../../../code-editor";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Label } from "../../../label";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import {
  CodeTemplateSelector,
  ExecutionPanel,
  InputVariableMapper,
  OutputSchemaEditor,
  RuntimeSelector,
} from "../../code-elements";
import type { CodeTemplateWithIcon } from "../../code-elements/code-templates";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface CodeConfigPanelProps {
  config: CodeNodeConfig;
  onChange: (config: Partial<CodeNodeConfig>) => void;
}

const TIMEOUT_OPTIONS = [
  { value: 5000, label: "5 seconds" },
  { value: 10_000, label: "10 seconds" },
  { value: 30_000, label: "30 seconds" },
  { value: 60_000, label: "1 minute" },
  { value: 120_000, label: "2 minutes" },
  { value: 300_000, label: "5 minutes" },
];
const SUPPORTED_RUNTIMES: CodeRuntime[] = ["javascript", "typescript"];
const RUNTIME_LABELS: Record<CodeRuntime, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  sql: "SQL",
};
const IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const RESERVED_NAMES = new Set([
  "input",
  "data",
  "$input",
  "$data",
  "vars",
  "console",
  "fetch",
  "process",
  "global",
]);
const MAX_RETRIES = 10;

function formatTimeout(ms: number): string {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  return `${ms / 60_000}m`;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function buildWarnings(config: CodeNodeConfig): string[] {
  const warnings: string[] = [];
  const runtime = config.runtime ?? "javascript";
  const runtimeLabel = RUNTIME_LABELS[runtime] ?? runtime;

  if (!SUPPORTED_RUNTIMES.includes(runtime)) {
    warnings.push(`${runtimeLabel} runtime is not supported`);
  }

  if (!config.code?.trim()) {
    warnings.push("Code is empty");
  }

  const inputVariables = config.inputVariables ?? [];
  const inputNames = inputVariables.map((variable) => variable.name.trim());
  const filteredInputNames = inputNames.filter(Boolean);

  if (inputNames.some((name) => !name)) {
    warnings.push("Fill in input variable names");
  }

  const normalizedInput = filteredInputNames.map(normalizeName);
  if (new Set(normalizedInput).size !== normalizedInput.length) {
    warnings.push("Duplicate input variable names detected");
  }

  if (filteredInputNames.some((name) => RESERVED_NAMES.has(name))) {
    warnings.push("Rename reserved input variables");
  }

  const outputFields = config.outputSchema ?? [];
  const outputNames = outputFields.map((field) => field.name.trim());
  const filteredOutputNames = outputNames.filter(Boolean);

  if (outputFields.length > 0 && outputNames.some((name) => !name)) {
    warnings.push("Fill in output field names");
  }

  const normalizedOutput = filteredOutputNames.map(normalizeName);
  if (new Set(normalizedOutput).size !== normalizedOutput.length) {
    warnings.push("Duplicate output field names detected");
  }

  if ((config.enableConsole ?? true) && !(config.sandboxed ?? true)) {
    warnings.push("Console logs are only captured in sandboxed mode");
  }

  return warnings;
}

function buildNotes(config: CodeNodeConfig): string[] {
  const notes: string[] = [];
  const runtime = config.runtime ?? "javascript";
  const inputVariables = config.inputVariables ?? [];
  const inputNames = inputVariables.map((variable) => variable.name.trim());
  const filteredInputNames = inputNames.filter(Boolean);

  if (
    filteredInputNames.some((name) => name && !IDENTIFIER_PATTERN.test(name))
  ) {
    notes.push('Use vars["name"] for non-identifier variables');
  }

  if (inputVariables.some((variable) => variable.sourcePath?.trim())) {
    notes.push("Source paths override variable names");
  }

  const outputCount = config.outputSchema?.length ?? 0;
  if (outputCount === 0) {
    notes.push("Output schema is not enforced");
  } else {
    notes.push("Output must be an object matching the schema");
  }

  if (config.sandboxed ?? true) {
    notes.push("Sandboxed execution blocks eval and dynamic codegen");
  }

  if (!(config.enableConsole ?? true)) {
    notes.push("Console logs are disabled");
  }

  if (config.retryOnError) {
    const maxRetries = Math.max(0, config.maxRetries ?? 0);
    notes.push(`Retries enabled (${maxRetries} max)`);
  }

  if (runtime === "typescript") {
    notes.push("TypeScript is transpiled at runtime");
  }

  return notes;
}

export const CodeConfigPanel = memo(
  forwardRef<HTMLDivElement, CodeConfigPanelProps>(
    function CodeConfigPanelComponent({ config, onChange }, ref) {
      const handleRuntimeChange = useCallback(
        (value: CodeRuntime) => {
          onChange({ runtime: value });
        },
        [onChange]
      );

      const handleTemplateSelect = useCallback(
        (template: CodeTemplateWithIcon) => {
          onChange({
            code: template.code,
            runtime: template.runtime,
          });
        },
        [onChange]
      );

      const handleInputVariablesChange = useCallback(
        (inputVariables: InputVariable[]) => {
          onChange({ inputVariables });
        },
        [onChange]
      );

      const handleCodeChange = useCallback(
        (code: string) => {
          onChange({ code });
        },
        [onChange]
      );

      const handleOutputSchemaChange = useCallback(
        (outputSchema: OutputField[]) => {
          onChange({ outputSchema });
        },
        [onChange]
      );

      const runtime = config.runtime ?? "javascript";
      const timeoutMs = config.timeoutMs ?? 30_000;
      const warnings = useMemo(() => buildWarnings(config), [config]);
      const notes = useMemo(() => buildNotes(config), [config]);
      const runtimeSupported = SUPPORTED_RUNTIMES.includes(runtime);

      return (
        <div
          className="min-w-0 divide-y divide-border/50 overflow-hidden"
          ref={ref}
        >
          <ConfigSection
            defaultOpen
            icon={<Icons.Code className="size-4" />}
            title="Code"
          >
            <div className="space-y-4">
              <ConfigField
                label="Runtime"
                tooltip="Select the programming language for your code"
              >
                <div className="flex items-center gap-2">
                  <RuntimeSelector
                    compact
                    onChange={handleRuntimeChange}
                    value={runtime}
                  />
                  <CodeTemplateSelector
                    disabled={!runtimeSupported}
                    onSelect={handleTemplateSelect}
                    runtime={runtime}
                  />
                </div>
              </ConfigField>

              <ConfigField label="Source Code">
                <CodeEditor
                  language={runtime}
                  maxHeight="400px"
                  minHeight="200px"
                  onChange={handleCodeChange}
                  placeholder={`Enter your ${runtime} code here...`}
                  value={config.code ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Download className="size-4" />}
            title="Input Variables"
          >
            <InputVariableMapper
              onChange={handleInputVariablesChange}
              variables={config.inputVariables ?? []}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Upload className="size-4" />}
            title="Output Schema"
          >
            <OutputSchemaEditor
              fields={config.outputSchema ?? []}
              onChange={handleOutputSchemaChange}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Execution Settings"
          >
            <div className="space-y-4">
              <ConfigField
                label="Timeout"
                tooltip="Maximum execution time before the code is terminated"
              >
                <div className="space-y-2">
                  <Slider
                    max={TIMEOUT_OPTIONS.length - 1}
                    min={0}
                    onValueChange={(values) => {
                      const idx = values[0];
                      if (idx !== undefined) {
                        const option = TIMEOUT_OPTIONS[idx];
                        if (option) {
                          onChange({ timeoutMs: option.value });
                        }
                      }
                    }}
                    step={1}
                    value={[
                      Math.max(
                        0,
                        TIMEOUT_OPTIONS.findIndex((o) => o.value === timeoutMs)
                      ),
                    ]}
                  />
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>5s</span>
                    <span className="font-medium text-foreground">
                      {formatTimeout(timeoutMs)}
                    </span>
                    <span>5m</span>
                  </div>
                </div>
              </ConfigField>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sandboxed Execution</Label>
                  <p className="text-muted-foreground text-xs">
                    Run code in isolated environment
                  </p>
                </div>
                <Switch
                  checked={config.sandboxed ?? true}
                  onCheckedChange={(sandboxed) => onChange({ sandboxed })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Console Logging</Label>
                  <p className="text-muted-foreground text-xs">
                    Capture console.log output
                  </p>
                </div>
                <Switch
                  checked={config.enableConsole ?? true}
                  onCheckedChange={(enableConsole) =>
                    onChange({ enableConsole })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Retry on Error</Label>
                  <p className="text-muted-foreground text-xs">
                    Retry the execution when it fails
                  </p>
                </div>
                <Switch
                  checked={config.retryOnError ?? false}
                  onCheckedChange={(retryOnError) => onChange({ retryOnError })}
                />
              </div>

              <AnimatedSizeContainer height>
                {config.retryOnError && (
                  <ConfigField
                    label="Max Retries"
                    tooltip="Maximum retry attempts after a failure"
                  >
                    <Input
                      className="h-9"
                      max={MAX_RETRIES}
                      min={0}
                      onChange={(e) => {
                        const retries = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(retries)) {
                          onChange({
                            maxRetries: Math.max(
                              0,
                              Math.min(MAX_RETRIES, retries)
                            ),
                          });
                        }
                      }}
                      placeholder="3"
                      type="number"
                      value={config.maxRetries ?? 3}
                    />
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Clock className="size-4" />}
            title="Last Execution"
          >
            <div className="space-y-4">
              <ExecutionPanel result={config.lastExecution} />
              <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
                Run the canvas to capture execution output and logs.
              </div>
            </div>
          </ConfigSection>
          <WarningsList items={warnings} />
          <NotesList items={notes} />
        </div>
      );
    }
  )
);

CodeConfigPanel.displayName = "CodeConfigPanel";
