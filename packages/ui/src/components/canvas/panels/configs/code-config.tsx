"use client";

import type {
  CodeNodeConfig,
  CodeRuntime,
  InputVariable,
  OutputField,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useState } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Label } from "../../../label";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
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

function formatTimeout(ms: number): string {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  return `${ms / 60_000}m`;
}

export const CodeConfigPanel = memo(
  forwardRef<HTMLDivElement, CodeConfigPanelProps>(
    function CodeConfigPanelComponent({ config, onChange }, ref) {
      const [isRunning, setIsRunning] = useState(false);

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

      const handleOutputSchemaChange = useCallback(
        (outputSchema: OutputField[]) => {
          onChange({ outputSchema });
        },
        [onChange]
      );

      const handleRunTest = useCallback(async () => {
        setIsRunning(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          onChange({
            lastExecution: {
              success: true,
              output: { result: "test output" },
              executionTimeMs: 42,
              logs: [
                {
                  level: "log",
                  message: "Execution started",
                  timestamp: Date.now() - 100,
                },
                {
                  level: "info",
                  message: "Processing input...",
                  timestamp: Date.now() - 50,
                },
                {
                  level: "log",
                  message: "Execution completed",
                  timestamp: Date.now(),
                },
              ],
            },
          });
        } catch {
          onChange({
            lastExecution: {
              success: false,
              executionTimeMs: 100,
              logs: [],
              error: {
                message: "Test execution failed",
              },
            },
          });
        } finally {
          setIsRunning(false);
        }
      }, [onChange]);

      const runtime = config.runtime ?? "javascript";
      const timeoutMs = config.timeoutMs ?? 30_000;

      return (
        <div className="divide-y divide-border/50" ref={ref}>
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
                    disabled={isRunning}
                    onSelect={handleTemplateSelect}
                    runtime={runtime}
                  />
                </div>
              </ConfigField>

              <ConfigField label="Source Code">
                <Textarea
                  className="min-h-[200px] resize-y bg-secondary/30 font-mono text-sm"
                  onChange={(e) => onChange({ code: e.target.value })}
                  placeholder={`Enter your ${runtime} code here...`}
                  spellCheck={false}
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
              disabled={isRunning}
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
              disabled={isRunning}
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

              <AnimatedSizeContainer height>
                {config.enableConsole && (
                  <ConfigField
                    label="Memory Limit"
                    tooltip="Maximum memory allowed for execution"
                  >
                    <Input
                      className="h-9"
                      onChange={(e) => {
                        const mb = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(mb) && mb > 0) {
                          onChange({ memoryLimitMb: mb });
                        }
                      }}
                      placeholder="128"
                      type="number"
                      value={config.memoryLimitMb ?? ""}
                    />
                    <p className="mt-1 text-muted-foreground text-xs">
                      Memory limit in MB (leave empty for default)
                    </p>
                  </ConfigField>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Play className="size-4" />}
            title="Test Execution"
          >
            <div className="space-y-4">
              <ConfigField label="Test Input">
                <Textarea
                  className="min-h-[80px] resize-y font-mono text-sm"
                  onChange={(e) => onChange({ testInput: e.target.value })}
                  placeholder='{"example": "input data"}'
                  spellCheck={false}
                  value={config.testInput ?? ""}
                />
              </ConfigField>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isRunning || !config.code}
                onClick={handleRunTest}
                type="button"
              >
                {isRunning ? (
                  <>
                    <Icons.Loader2 className="size-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Icons.Play className="size-4" />
                    Run Test
                  </>
                )}
              </button>

              <ExecutionPanel
                isRunning={isRunning}
                result={config.lastExecution}
              />
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

CodeConfigPanel.displayName = "CodeConfigPanel";
