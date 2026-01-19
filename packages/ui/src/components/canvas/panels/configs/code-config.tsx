"use client";

import type { ScriptNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useState } from "react";
import { Badge } from "../../../badge";
import { Button } from "../../../button";
import { Icons } from "../../../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript", extension: ".js" },
  { id: "python", name: "Python", extension: ".py" },
] as const;

const CODE_TEMPLATES: Record<string, string> = {
  javascript: `async function execute(input, context) {
  return { result: input };
}`,
  python: `async def execute(input: dict, context: Context) -> dict:
    return {"result": input}`,
};

interface CodeConfigPanelProps {
  config: ScriptNodeConfig;
  onChange: (config: Partial<ScriptNodeConfig>) => void;
}

export const CodeConfigPanel = memo(
  forwardRef<HTMLDivElement, CodeConfigPanelProps>(
    function CodeConfigPanelComponent({ config, onChange }, ref) {
      const [isRunning, setIsRunning] = useState(false);
      const [testResult, setTestResult] = useState<{
        success: boolean;
        output?: string;
        error?: string;
      } | null>(null);

      const handleLanguageChange = useCallback(
        (runtime: string) => {
          onChange({
            runtime: runtime as ScriptNodeConfig["runtime"],
            code: CODE_TEMPLATES[runtime] ?? CODE_TEMPLATES.javascript,
          });
        },
        [onChange]
      );

      const handleRunTest = useCallback(async () => {
        setIsRunning(true);
        setTestResult(null);

        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setTestResult({ success: true, output: '{"result": "test"}' });
        } catch (error) {
          setTestResult({ success: false, error: String(error) });
        } finally {
          setIsRunning(false);
        }
      }, []);

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Code className="size-4" />}
            title="Code"
          >
            <div className="space-y-4">
              <ConfigField label="Language" required>
                <Select
                  onValueChange={handleLanguageChange}
                  value={config.runtime ?? "javascript"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        <div className="flex items-center gap-2">
                          <span>{lang.name}</span>
                          <Badge
                            className="font-mono text-xs"
                            variant="outline"
                          >
                            {lang.extension}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField label="Source Code">
                <div className="relative">
                  <Textarea
                    className="min-h-[240px] resize-y bg-secondary/30 font-mono text-sm"
                    onChange={(e) => onChange({ code: e.target.value })}
                    spellCheck={false}
                    value={
                      config.code ??
                      CODE_TEMPLATES[config.runtime ?? "javascript"]
                    }
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      disabled={isRunning}
                      onClick={handleRunTest}
                      size="sm"
                      variant="secondary"
                    >
                      <Icons.Play className="mr-1 size-3.5" />
                      {isRunning ? "Running..." : "Test"}
                    </Button>
                  </div>
                </div>
              </ConfigField>

              {testResult && (
                <div
                  className={`rounded-md p-3 font-mono text-sm ${
                    testResult.success
                      ? "border border-green-500/20 bg-green-500/10 text-green-500"
                      : "border border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResult.success ? testResult.output : testResult.error}
                </div>
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Execution"
          >
            <div className="space-y-4">
              <ConfigField label="Timeout">
                <Select
                  onValueChange={(v) =>
                    onChange({ timeoutMs: Number.parseInt(v, 10) })
                  }
                  value={String(config.timeoutMs ?? 30_000)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5000">5 seconds</SelectItem>
                    <SelectItem value="10000">10 seconds</SelectItem>
                    <SelectItem value="30000">30 seconds</SelectItem>
                    <SelectItem value="60000">1 minute</SelectItem>
                    <SelectItem value="300000">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

CodeConfigPanel.displayName = "CodeConfigPanel";
