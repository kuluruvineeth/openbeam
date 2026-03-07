"use client";

import { DEFAULT_RERANKER_MODEL_ID } from "@openbeam/types/ai";
import type { RagNodeConfig } from "@openbeam/types/canvas";
import type { ConnectorType } from "@openbeam/types/services/connectors/events";
import type { ComponentType } from "react";
import { memo, useCallback } from "react";
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
import {
  CitationStyleSelector,
  type ConnectorSource,
  ConnectorSourceSelector,
  RerankerSelector,
  SearchStrategySelector,
} from "../../ai-elements";
import type { LogoProps } from "../../event-builder";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface SectionProps {
  config: RagNodeConfig;
  onChange: (config: Partial<RagNodeConfig>) => void;
}

export const SearchStrategySection = memo(
  function SearchStrategySectionComponent({ config, onChange }: SectionProps) {
    return (
      <ConfigSection
        defaultOpen
        icon={<Icons.Search className="size-4" />}
        title="Search Strategy"
      >
        <div className="space-y-4">
          <SearchStrategySelector
            onChange={(searchType) => onChange({ searchType })}
            value={config.searchType ?? "hybrid"}
          />
        </div>
      </ConfigSection>
    );
  }
);

export const RetrievalSettingsSection = memo(
  function RetrievalSettingsSectionComponent({
    config,
    onChange,
  }: SectionProps) {
    const minScore = config.minScore ?? 0.5;
    const highScoreWarning = minScore >= 0.85;
    return (
      <ConfigSection
        defaultOpen
        icon={<Icons.Layers className="size-4" />}
        title="Retrieval Settings"
      >
        <div className="space-y-4">
          <ConfigField
            label="Top K Results"
            tooltip="Number of documents to retrieve"
          >
            <div className="flex items-center gap-4">
              <Slider
                className="flex-1"
                max={50}
                min={1}
                onValueChange={(v) => onChange({ topK: v[0] })}
                step={1}
                value={[config.topK ?? 10]}
              />
              <span className="w-8 text-right font-mono text-sm tabular-nums">
                {config.topK ?? 10}
              </span>
            </div>
          </ConfigField>

          <ConfigField
            label="Min Relevance Score"
            tooltip="Minimum similarity threshold (0-1)"
          >
            <div className="flex items-center gap-4">
              <Slider
                className="flex-1"
                max={1}
                min={0}
                onValueChange={(v) => onChange({ minScore: v[0] })}
                step={0.05}
                value={[minScore]}
              />
              <span className="w-10 text-right font-mono text-sm tabular-nums">
                {minScore.toFixed(2)}
              </span>
            </div>
          </ConfigField>

          <ConfigField
            label="Diversity Penalty"
            tooltip="Encourages varied results (0 = no diversity)"
          >
            <div className="flex items-center gap-4">
              <Slider
                className="flex-1"
                max={1}
                min={0}
                onValueChange={(v) => onChange({ diversityPenalty: v[0] })}
                step={0.1}
                value={[config.diversityPenalty ?? 0]}
              />
              <span className="w-10 text-right font-mono text-sm tabular-nums">
                {(config.diversityPenalty ?? 0).toFixed(1)}
              </span>
            </div>
          </ConfigField>

          {highScoreWarning && (
            <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
              <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>High thresholds may return no results.</span>
            </div>
          )}
        </div>
      </ConfigSection>
    );
  }
);

interface KnowledgeSourcesSectionProps extends SectionProps {
  availableSources: ConnectorSource[];
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
}

export const KnowledgeSourcesSection = memo(
  function KnowledgeSourcesSectionComponent({
    config,
    onChange,
    availableSources,
    connectorLogos,
  }: KnowledgeSourcesSectionProps) {
    const handleSourcesChange = useCallback(
      (sources: string[]) => {
        onChange({
          connectorTypes: sources.length > 0 ? sources : undefined,
        });
      },
      [onChange]
    );

    return (
      <ConfigSection
        badge={config.connectorTypes?.length ?? "All"}
        defaultOpen
        icon={<Icons.Database className="size-4" />}
        title="Knowledge Sources"
      >
        <ConnectorSourceSelector
          availableSources={availableSources}
          logos={connectorLogos}
          onChange={handleSourcesChange}
          selectedSources={config.connectorTypes ?? []}
        />
      </ConfigSection>
    );
  }
);

export const SynthesisSection = memo(function SynthesisSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const synthesizeEnabled = config.synthesize ?? true;

  return (
    <ConfigSection
      badge={synthesizeEnabled ? "On" : "Off"}
      defaultOpen
      icon={<Icons.Sparkles className="size-4" />}
      title="Answer Synthesis"
    >
      <div className="space-y-4">
        <ConfigField horizontal label="Enable Synthesis">
          <Switch
            checked={synthesizeEnabled}
            onCheckedChange={(synthesize) => onChange({ synthesize })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {synthesizeEnabled && (
            <SynthesisOptions config={config} onChange={onChange} />
          )}
        </AnimatedSizeContainer>

        {!synthesizeEnabled && (
          <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground text-xs">
            <Icons.Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Returns chunks and citations only; no synthesized answer.
            </span>
          </div>
        )}
      </div>
    </ConfigSection>
  );
});

const SynthesisOptions = memo(function SynthesisOptionsComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <div className="space-y-4">
      <ConfigField label="Model" tooltip="LLM for answer generation">
        <Input
          className="h-9"
          onChange={(e) => onChange({ model: e.target.value || undefined })}
          placeholder="Default model"
          value={config.model ?? ""}
        />
      </ConfigField>

      <ConfigField
        label="Citation Style"
        tooltip="How to display source references"
      >
        <CitationStyleSelector
          onChange={(citationStyle) => onChange({ citationStyle })}
          value={config.citationStyle ?? "inline"}
        />
      </ConfigField>

      <ConfigField
        label="System Prompt"
        tooltip="Custom instructions for synthesis"
      >
        <Textarea
          className="min-h-[80px] resize-none"
          onChange={(e) =>
            onChange({
              systemPrompt: e.target.value || undefined,
            })
          }
          placeholder="Use default RAG prompt"
          value={config.systemPrompt ?? ""}
        />
      </ConfigField>
    </div>
  );
});

export const QueryEnhancementSection = memo(
  function QueryEnhancementSectionComponent({
    config,
    onChange,
  }: SectionProps) {
    return (
      <ConfigSection
        defaultOpen={false}
        icon={<Icons.Wand className="size-4" />}
        title="Query Enhancement"
      >
        <div className="space-y-4">
          <ConfigField
            horizontal
            label="Query Expansion"
            tooltip="Expand queries with synonyms"
          >
            <Switch
              checked={config.queryExpansion ?? false}
              onCheckedChange={(queryExpansion) => onChange({ queryExpansion })}
            />
          </ConfigField>
        </div>
      </ConfigSection>
    );
  }
);

const CHUNK_STRATEGIES = [
  { id: "semantic", name: "Semantic", description: "Context-aware boundaries" },
  { id: "fixed", name: "Fixed", description: "Fixed token count" },
  { id: "sentence", name: "Sentence", description: "Split by sentences" },
  { id: "paragraph", name: "Paragraph", description: "Split by paragraphs" },
] as const;

export const ChunkingSection = memo(function ChunkingSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Scissors className="size-4" />}
      title="Chunking Strategy"
    >
      <div className="space-y-4">
        <ConfigField label="Strategy">
          <Select
            onValueChange={(strategy) =>
              onChange({
                chunkStrategy: strategy as RagNodeConfig["chunkStrategy"],
              })
            }
            value={config.chunkStrategy ?? "semantic"}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHUNK_STRATEGIES.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  <div className="flex flex-col">
                    <span>{strategy.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {strategy.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <ChunkSizeFields config={config} onChange={onChange} />
      </div>
    </ConfigSection>
  );
});

const ChunkSizeFields = memo(function ChunkSizeFieldsComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <>
      <ConfigField label="Max Chunk Size" tooltip="Maximum tokens per chunk">
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            max={2048}
            min={128}
            onValueChange={(v) => onChange({ maxChunkSize: v[0] })}
            step={64}
            value={[config.maxChunkSize ?? 512]}
          />
          <span className="w-12 text-right font-mono text-sm tabular-nums">
            {config.maxChunkSize ?? 512}
          </span>
        </div>
      </ConfigField>

      <ConfigField label="Chunk Overlap" tooltip="Token overlap between chunks">
        <div className="flex items-center gap-4">
          <Slider
            className="flex-1"
            max={256}
            min={0}
            onValueChange={(v) => onChange({ chunkOverlap: v[0] })}
            step={16}
            value={[config.chunkOverlap ?? 50]}
          />
          <span className="w-10 text-right font-mono text-sm tabular-nums">
            {config.chunkOverlap ?? 50}
          </span>
        </div>
      </ConfigField>
    </>
  );
});

export const PostProcessingSection = memo(
  function PostProcessingSectionComponent({ config, onChange }: SectionProps) {
    const rerankEnabled = config.rerank ?? true;
    const deduplicateEnabled = config.deduplicate ?? true;

    return (
      <ConfigSection
        defaultOpen={false}
        icon={<Icons.Settings2 className="size-4" />}
        title="Post-Processing"
      >
        <div className="space-y-4">
          <ConfigField
            horizontal
            label="Reranking"
            tooltip="Rerank results for relevance"
          >
            <Switch
              checked={rerankEnabled}
              onCheckedChange={(rerank) => onChange({ rerank })}
            />
          </ConfigField>

          <AnimatedSizeContainer height>
            {rerankEnabled && (
              <RerankModelField config={config} onChange={onChange} />
            )}
          </AnimatedSizeContainer>

          <ConfigField
            horizontal
            label="Deduplicate"
            tooltip="Remove similar chunks"
          >
            <Switch
              checked={deduplicateEnabled}
              onCheckedChange={(deduplicate) => onChange({ deduplicate })}
            />
          </ConfigField>

          <AnimatedSizeContainer height>
            {deduplicateEnabled && (
              <DedupeThresholdField config={config} onChange={onChange} />
            )}
          </AnimatedSizeContainer>
        </div>
      </ConfigSection>
    );
  }
);

const RerankModelField = memo(function RerankModelFieldComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigField label="Rerank Model">
      <RerankerSelector
        disabled
        onValueChange={(rerankModel) => onChange({ rerankModel })}
        value={config.rerankModel ?? DEFAULT_RERANKER_MODEL_ID}
      />
      <p className="mt-2 text-muted-foreground text-xs">
        Heuristic reranking is active. Model selection will be enabled when
        model-based reranking ships.
      </p>
    </ConfigField>
  );
});

const DedupeThresholdField = memo(function DedupeThresholdFieldComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigField
      label="Deduplication Threshold"
      tooltip="Similarity threshold for deduplication"
    >
      <div className="flex items-center gap-4">
        <Slider
          className="flex-1"
          max={1}
          min={0.5}
          onValueChange={(v) => onChange({ dedupeThreshold: v[0] })}
          step={0.05}
          value={[config.dedupeThreshold ?? 0.95]}
        />
        <span className="w-10 text-right font-mono text-sm tabular-nums">
          {(config.dedupeThreshold ?? 0.95).toFixed(2)}
        </span>
      </div>
    </ConfigField>
  );
});
