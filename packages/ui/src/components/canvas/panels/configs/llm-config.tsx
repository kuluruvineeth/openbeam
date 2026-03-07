"use client";

import { DEFAULT_CHAT_MODEL } from "@openbeam/types/ai";
import type { LlmNodeConfig } from "@openbeam/types/canvas";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "../../../button";
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
import { ModelSelector, PromptStrengthIndicator } from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const RESPONSE_FORMATS = [
  { id: "text", name: "Text", description: "Plain text response" },
  { id: "json", name: "JSON", description: "JSON object response" },
  {
    id: "structured",
    name: "Structured",
    description: "Schema-validated output",
  },
] as const;

interface LlmConfigPanelProps {
  config: LlmNodeConfig;
  onChange: (config: Partial<LlmNodeConfig>) => void;
}

export const LlmConfigPanel = memo(
  forwardRef<HTMLDivElement, LlmConfigPanelProps>(
    function LlmConfigPanelComponent({ config, onChange }, ref) {
      const tools = config.tools ?? [];
      const hasTools = tools.length > 0;
      const [toolInput, setToolInput] = useState("");
      const trimmedTool = toolInput.trim();
      const toolExists = tools.includes(trimmedTool);
      const toolError =
        trimmedTool && toolExists ? "Tool already added" : undefined;
      const schemaError = useMemo(() => {
        if (config.responseFormat !== "structured") {
          return;
        }
        if (config.outputSchema === undefined || config.outputSchema === null) {
          return "Output schema is required";
        }
        if (typeof config.outputSchema === "string") {
          const trimmed = config.outputSchema.trim();
          if (!trimmed) {
            return "Output schema is required";
          }
          try {
            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== "object") {
              return "Output schema must be a JSON object";
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            return `Invalid JSON: ${message}`;
          }
          return;
        }
        if (typeof config.outputSchema !== "object") {
          return "Output schema must be a JSON object";
        }
        return;
      }, [config.outputSchema, config.responseFormat]);

      const handleRemoveTool = useCallback(
        (index: number) => {
          const newTools = tools.filter((_, i) => i !== index);
          onChange({ tools: newTools });
        },
        [tools, onChange]
      );

      const handleAddTool = useCallback(() => {
        if (!trimmedTool || toolExists) {
          return;
        }
        onChange({ tools: [...tools, trimmedTool] });
        setToolInput("");
      }, [trimmedTool, toolExists, tools, onChange]);

      useEffect(() => {
        if (hasTools && config.streaming) {
          onChange({ streaming: false });
        }
      }, [hasTools, config.streaming, onChange]);

      const modelValue = config.model?.trim() || DEFAULT_CHAT_MODEL;
      let schemaTextValue = "";
      if (typeof config.outputSchema === "string") {
        schemaTextValue = config.outputSchema;
      } else if (config.outputSchema) {
        schemaTextValue = JSON.stringify(config.outputSchema, null, 2) ?? "";
      }
      const streamingDisabled = hasTools;
      const toolHelperText =
        "Tools require tool context (teamId and userId) in the input payload.";

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.BotIcon className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model" required>
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="chat"
                  value={modelValue}
                />
              </ConfigField>

              <ConfigField
                label="Temperature"
                tooltip="Controls randomness. 0 = deterministic, 2 = very creative"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={2}
                    min={0}
                    onValueChange={(v) => onChange({ temperature: v[0] })}
                    step={0.1}
                    value={[config.temperature ?? 0.7]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.temperature ?? 0.7).toFixed(1)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Max Tokens"
                tooltip="Maximum tokens in response"
              >
                <Input
                  className="h-9 font-mono"
                  max={128_000}
                  min={1}
                  onChange={(e) =>
                    onChange({
                      maxTokens: Number.parseInt(e.target.value, 10) || 4096,
                    })
                  }
                  type="number"
                  value={config.maxTokens ?? 4096}
                />
              </ConfigField>

              <ConfigField label="Streaming">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    {streamingDisabled
                      ? "Streaming disabled when tools are enabled"
                      : "Stream response tokens"}
                  </span>
                  <Switch
                    checked={config.streaming ?? true}
                    disabled={streamingDisabled}
                    onCheckedChange={(streaming) => onChange({ streaming })}
                  />
                </div>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Text className="size-4" />}
            title="Prompts"
          >
            <div className="space-y-4">
              <ConfigField
                label="System Prompt"
                tooltip="Instructions for model behavior"
              >
                <Textarea
                  className="min-h-[120px] resize-y"
                  onChange={(e) => onChange({ systemPrompt: e.target.value })}
                  placeholder="You are a helpful assistant..."
                  value={config.systemPrompt ?? ""}
                />
              </ConfigField>

              {config.systemPrompt && (
                <PromptStrengthIndicator
                  compact
                  prompt={config.systemPrompt}
                  showSuggestions={false}
                />
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.ExternalLink className="size-4" />}
            title="Output"
          >
            <div className="space-y-4">
              <ConfigField
                label="Response Format"
                tooltip="Text: Plain text. JSON: JSON object. Structured: Schema-validated output."
              >
                <Select
                  onValueChange={(format) =>
                    onChange({
                      responseFormat: format as LlmNodeConfig["responseFormat"],
                    })
                  }
                  value={config.responseFormat ?? "text"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_FORMATS.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              {config.responseFormat === "structured" && (
                <ConfigField
                  error={schemaError}
                  label="Output Schema"
                  tooltip="JSON Schema for structured output"
                >
                  <Textarea
                    className="min-h-[100px] resize-y font-mono text-sm"
                    onChange={(e) => {
                      try {
                        onChange({ outputSchema: JSON.parse(e.target.value) });
                      } catch {
                        onChange({ outputSchema: e.target.value });
                      }
                    }}
                    placeholder='{"type": "object", "properties": {...}}'
                    value={schemaTextValue}
                  />
                </ConfigField>
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            badge={tools.length}
            defaultOpen={false}
            icon={<Icons.Wrench className="size-4" />}
            title="Tools"
          >
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
                  key={tool}
                >
                  <span className="font-mono text-sm">{tool}</span>
                  <Button
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveTool(index)}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.Close className="size-3.5" />
                  </Button>
                </div>
              ))}
              <ConfigField error={toolError} label="Add tool">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 font-mono text-sm"
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTool();
                      }
                    }}
                    placeholder="tool_name"
                    value={toolInput}
                  />
                  <Button
                    className="h-9 px-3"
                    disabled={!trimmedTool || toolExists}
                    onClick={handleAddTool}
                    size="sm"
                    variant="outline"
                  >
                    <Icons.Plus className="mr-1.5 size-3.5" />
                    Add
                  </Button>
                </div>
              </ConfigField>
              <p className="text-muted-foreground text-xs">{toolHelperText}</p>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings className="size-4" />}
            title="Advanced"
          >
            <div className="space-y-4">
              <ConfigField label="Top P" tooltip="Nucleus sampling threshold">
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) => onChange({ topP: v[0] })}
                    step={0.05}
                    value={[config.topP ?? 1]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.topP ?? 1).toFixed(2)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Frequency Penalty"
                tooltip="Penalize repeated tokens"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={2}
                    min={0}
                    onValueChange={(v) => onChange({ frequencyPenalty: v[0] })}
                    step={0.1}
                    value={[config.frequencyPenalty ?? 0]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.frequencyPenalty ?? 0).toFixed(1)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Presence Penalty"
                tooltip="Encourage topic diversity"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={2}
                    min={0}
                    onValueChange={(v) => onChange({ presencePenalty: v[0] })}
                    step={0.1}
                    value={[config.presencePenalty ?? 0]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.presencePenalty ?? 0).toFixed(1)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField label="Stop Sequences" tooltip="Stop generation at">
                <Textarea
                  className="min-h-[60px] resize-y font-mono text-sm"
                  onChange={(e) => {
                    const stops = e.target.value
                      .split("\n")
                      .filter((s) => s.trim());
                    onChange({ stop: stops.length > 0 ? stops : undefined });
                  }}
                  placeholder="Enter stop sequences (one per line)"
                  value={config.stop?.join("\n") ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

LlmConfigPanel.displayName = "LlmConfigPanel";
