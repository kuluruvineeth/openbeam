"use client";

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

  const handleStrategyChange = useCallback(
    (newStrategy: SummarizationStrategy) => {
      onChange({ strategy: newStrategy });
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

        <ConfigField label="Model" tooltip="LLM for summarization">
          <Input
            className="h-9"
            onChange={(e) => onChange({ model: e.target.value || undefined })}
            placeholder="Default model"
            value={config.model ?? ""}
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

  const handleFormatChange = useCallback(
    (newFormat: SummaryOutputFormat) => {
      onChange({ outputFormat: newFormat });
    },
    [onChange]
  );

  const handleLengthChange = useCallback(
    (newLength: SummaryLength) => {
      onChange({ length: newLength });
    },
    [onChange]
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

        <ConfigField label="Length">
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
                onChange={(citationStyle) => onChange({ citationStyle })}
                value={config.citationStyle ?? "inline"}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>
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
              onValueChange={(v) => onChange({ chunkSize: v[0] })}
              step={128}
              value={[config.chunkSize ?? 1000]}
            />
            <span className="w-12 text-right font-mono text-sm tabular-nums">
              {config.chunkSize ?? 1000}
            </span>
          </div>
        </ConfigField>

        <ConfigField label="Chunk Overlap" tooltip="Overlap between chunks">
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={512}
              min={0}
              onValueChange={(v) => onChange({ chunkOverlap: v[0] })}
              step={32}
              value={[config.chunkOverlap ?? 100]}
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums">
              {config.chunkOverlap ?? 100}
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
