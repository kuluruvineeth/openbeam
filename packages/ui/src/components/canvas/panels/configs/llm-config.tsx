"use client";

import type { LlmNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Badge } from "../../../badge";
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
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const CHAT_MODELS = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "Anthropic",
  },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", provider: "Google" },
] as const;

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
      const handleRemoveTool = useCallback(
        (index: number) => {
          const newTools = config.tools?.filter((_, i) => i !== index);
          onChange({ tools: newTools });
        },
        [config.tools, onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.BotIcon className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model" required>
                <Select
                  onValueChange={(model) => onChange({ model })}
                  value={config.model ?? "claude-sonnet-4-20250514"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAT_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{model.name}</span>
                          <Badge className="text-xs" variant="outline">
                            {model.provider}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.ExternalLink className="size-4" />}
            title="Output"
          >
            <div className="space-y-4">
              <ConfigField label="Response Format">
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
                        <div className="flex flex-col">
                          <span>{format.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {format.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              {config.responseFormat === "structured" && (
                <ConfigField
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
                    value={
                      typeof config.outputSchema === "string"
                        ? config.outputSchema
                        : (JSON.stringify(config.outputSchema, null, 2) ?? "")
                    }
                  />
                </ConfigField>
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            badge={config.tools?.length ?? 0}
            defaultOpen={false}
            icon={<Icons.Wrench className="size-4" />}
            title="Tools"
          >
            <div className="space-y-2">
              {config.tools?.map((tool, index) => (
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
              <Button className="w-full" size="sm" variant="outline">
                <Icons.Plus className="mr-1.5 size-3.5" />
                Add Tool
              </Button>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

LlmConfigPanel.displayName = "LlmConfigPanel";
