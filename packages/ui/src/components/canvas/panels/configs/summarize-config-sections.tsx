"use client";

import { DEFAULT_CHAT_MODEL } from "@openplane/types/ai";
import type {
  SummarizationStrategy,
  SummarizeNodeConfig,
  SummaryFocusArea,
  SummaryLength,
  SummaryOutputFormat,
} from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import {
  CitationStyleSelector,
  FocusAreaSelector,
  ModelSelector,
  OutputFormatSelector,
  SummarizationStrategySelector,
  SummaryLengthSelector,
} from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface SectionProps {
  config: SummarizeNodeConfig;
  onChange: (config: Partial<SummarizeNodeConfig>) => void;
}

const STRATEGY_LABELS: Record<SummarizationStrategy, string> = {
  auto: "Auto",
  stuff: "Stuff",
  map_reduce: "Map-Reduce",
  refine: "Refine",
};

export const StrategySection = memo(function StrategySectionComponent({
  config,
  onChange,
}: SectionProps) {
  const strategy = config.strategy ?? "auto";
  const modelValue = config.model?.trim() || DEFAULT_CHAT_MODEL;

  const handleStrategyChange = useCallback(
    (newStrategy: SummarizationStrategy) => {
      onChange({ strategy: newStrategy });
    },
    [onChange]
  );

  const handleModelChange = useCallback(
    (model: string) => {
      onChange({ model });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={STRATEGY_LABELS[strategy]}
      defaultOpen
      icon={<Icons.GitBranch className="size-4" />}
      title="Strategy"
    >
      <div className="space-y-4">
        <SummarizationStrategySelector
          onChange={handleStrategyChange}
          value={strategy}
        />

        <ConfigField label="Model" required tooltip="LLM for summarization">
          <ModelSelector
            onValueChange={handleModelChange}
            type="chat"
            value={modelValue}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const FORMAT_LABELS: Record<SummaryOutputFormat, string> = {
  paragraph: "Paragraph",
  bullets: "Bullets",
  executive: "Executive",
  key_points: "Key Points",
  action_items: "Actions",
  timeline: "Timeline",
  qa_pairs: "Q&A",
};

const LENGTH_LABELS: Record<SummaryLength, string> = {
  brief: "Brief",
  standard: "Standard",
  detailed: "Detailed",
  custom: "Custom",
};

export const OutputFormatSection = memo(function OutputFormatSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const format = config.outputFormat ?? "paragraph";
  const length = config.length ?? "standard";
  const isCustomLength = length === "custom";
  const lengthError =
    isCustomLength && !(config.maxWords && config.maxWords >= 50)
      ? "Custom length requires a word limit"
      : undefined;

  const handleFormatChange = useCallback(
    (newFormat: SummaryOutputFormat) => {
      onChange({ outputFormat: newFormat });
    },
    [onChange]
  );

  const handleLengthChange = useCallback(
    (newLength: SummaryLength) => {
      if (newLength === "custom") {
        onChange({ length: newLength, maxWords: config.maxWords ?? 200 });
        return;
      }
      onChange({ length: newLength, maxWords: undefined });
    },
    [config.maxWords, onChange]
  );

  const handleCustomWordsChange = useCallback(
    (words: number | undefined) => {
      onChange({ maxWords: words });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={`${FORMAT_LABELS[format]} · ${LENGTH_LABELS[length]}`}
      defaultOpen
      icon={<Icons.AlignLeft className="size-4" />}
      title="Output Format"
    >
      <div className="space-y-4">
        <ConfigField label="Format">
          <OutputFormatSelector onChange={handleFormatChange} value={format} />
        </ConfigField>

        <ConfigField error={lengthError} label="Length">
          <SummaryLengthSelector
            customWords={config.maxWords}
            onChange={handleLengthChange}
            onCustomWordsChange={handleCustomWordsChange}
            value={length}
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Preserve Structure"
          tooltip="Maintain original document structure"
        >
          <Switch
            checked={config.preserveStructure ?? false}
            onCheckedChange={(preserveStructure) =>
              onChange({ preserveStructure })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

export const FocusAreasSection = memo(function FocusAreasSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const focusAreas = config.focusAreas ?? [];
  const extractEntities = config.extractEntities ?? false;

  const handleFocusAreasChange = useCallback(
    (areas: SummaryFocusArea[]) => {
      onChange({ focusAreas: areas.length > 0 ? areas : undefined });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={focusAreas.length > 0 ? focusAreas.length : "None"}
      defaultOpen={false}
      icon={<Icons.Target className="size-4" />}
      title="Focus Areas"
    >
      <div className="space-y-4">
        <FocusAreaSelector
          onChange={handleFocusAreasChange}
          value={focusAreas}
        />

        <ConfigField
          horizontal
          label="Extract Entities"
          tooltip="Identify people, orgs, dates, etc."
        >
          <Switch
            checked={extractEntities}
            onCheckedChange={(checked) =>
              onChange({ extractEntities: checked })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

export const CitationsSection = memo(function CitationsSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const includeCitations = config.includeCitations ?? false;
  const citationStyle = config.citationStyle ?? "inline";
  const hideCitationsWarning =
    includeCitations && citationStyle === "none"
      ? "Citations enabled, but summary text hides references"
      : undefined;

  return (
    <ConfigSection
      badge={includeCitations ? "On" : "Off"}
      defaultOpen={false}
      icon={<Icons.Quote className="size-4" />}
      title="Citations"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Include Citations"
          tooltip="Add source references to summary"
        >
          <Switch
            checked={includeCitations}
            onCheckedChange={(checked) =>
              onChange({ includeCitations: checked })
            }
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {includeCitations && (
            <ConfigField label="Citation Style">
              <CitationStyleSelector
                onChange={(nextStyle) => onChange({ citationStyle: nextStyle })}
                value={citationStyle}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>

        {hideCitationsWarning && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
            <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{hideCitationsWarning}</span>
          </div>
        )}
      </div>
    </ConfigSection>
  );
});

export const ChunkingSection = memo(function ChunkingSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const strategy = config.strategy ?? "auto";
  const showChunking = strategy === "map_reduce" || strategy === "refine";
  const chunkSize = config.chunkSize ?? 1000;
  const chunkOverlap = config.chunkOverlap ?? 100;
  const maxOverlap = Math.min(512, Math.max(0, chunkSize - 1));
  const overlapError =
    chunkOverlap >= chunkSize ? "Overlap must be smaller than chunk size" : "";

  if (!showChunking && strategy !== "auto") {
    return null;
  }

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Scissors className="size-4" />}
      title="Chunking"
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2">
          <p className="text-muted-foreground text-xs">
            Chunking applies when using Map-Reduce or Refine strategies for
            documents exceeding context limits.
          </p>
        </div>

        <ConfigField label="Chunk Size" tooltip="Tokens per chunk">
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={4096}
              min={256}
              onValueChange={(v) => {
                const nextSize = v[0];
                if (nextSize === undefined) {
                  return;
                }
                const nextOverlap = Math.min(
                  config.chunkOverlap ?? 100,
                  Math.max(0, nextSize - 1)
                );
                onChange(
                  nextOverlap !== (config.chunkOverlap ?? 100)
                    ? { chunkSize: nextSize, chunkOverlap: nextOverlap }
                    : { chunkSize: nextSize }
                );
              }}
              step={128}
              value={[chunkSize]}
            />
            <span className="w-12 text-right font-mono text-sm tabular-nums">
              {chunkSize}
            </span>
          </div>
        </ConfigField>

        <ConfigField
          error={overlapError || undefined}
          label="Chunk Overlap"
          tooltip="Overlap between chunks"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={maxOverlap}
              min={0}
              onValueChange={(v) => {
                const nextOverlap = v[0];
                if (nextOverlap === undefined) {
                  return;
                }
                onChange({ chunkOverlap: Math.min(nextOverlap, maxOverlap) });
              }}
              step={32}
              value={[Math.min(chunkOverlap, maxOverlap)]}
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums">
              {Math.min(chunkOverlap, maxOverlap)}
            </span>
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

export const AdvancedSection = memo(function AdvancedSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const maxTokensError =
    config.maxTokens !== undefined && config.maxTokens <= 0
      ? "Max tokens must be positive"
      : undefined;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Settings2 className="size-4" />}
      title="Advanced"
    >
      <div className="space-y-4">
        <ConfigField
          label="Temperature"
          tooltip="Lower = more focused, Higher = more creative"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={1}
              min={0}
              onValueChange={(v) => onChange({ temperature: v[0] })}
              step={0.1}
              value={[config.temperature ?? 0.3]}
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums">
              {(config.temperature ?? 0.3).toFixed(1)}
            </span>
          </div>
        </ConfigField>

        <ConfigField
          error={maxTokensError}
          label="Max Tokens"
          tooltip="Maximum tokens in the summary response"
        >
          <Input
            className="h-9 font-mono"
            max={128_000}
            min={1}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onChange({
                maxTokens: Number.isNaN(parsed) ? undefined : parsed,
              });
            }}
            type="number"
            value={config.maxTokens ?? ""}
          />
        </ConfigField>

        <ConfigField label="Language" tooltip="Output language (optional)">
          <Input
            className="h-9"
            onChange={(e) =>
              onChange({ language: e.target.value || undefined })
            }
            placeholder="Auto-detect"
            value={config.language ?? ""}
          />
        </ConfigField>

        <ConfigField
          label="Custom Instructions"
          tooltip="Additional instructions for the summary"
        >
          <Textarea
            className="min-h-[80px] resize-none"
            onChange={(e) =>
              onChange({ customInstructions: e.target.value || undefined })
            }
            placeholder="Add specific instructions for summarization..."
            value={config.customInstructions ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});
