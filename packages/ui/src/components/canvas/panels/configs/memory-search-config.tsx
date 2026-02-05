"use client";

import type {
  MemoryScope,
  MemorySearchMode,
  MemorySearchNodeConfig,
  MemoryType,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback, useMemo } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface MemorySearchConfigPanelProps {
  config: MemorySearchNodeConfig;
  onChange: (config: Partial<MemorySearchNodeConfig>) => void;
}

const SCOPES: { id: MemoryScope; label: string; icon: keyof typeof Icons }[] = [
  { id: "workflow", label: "Workflow", icon: "Workflow" },
  { id: "session", label: "Session", icon: "Repeat" },
  { id: "user", label: "User", icon: "User" },
  { id: "team", label: "Team", icon: "Users" },
  { id: "global", label: "Global", icon: "Globe" },
];

const SEARCH_MODES: {
  id: MemorySearchMode;
  label: string;
  description: string;
}[] = [
  { id: "hybrid", label: "Hybrid", description: "Semantic + keyword" },
  { id: "semantic", label: "Semantic", description: "Vector similarity" },
  { id: "keyword", label: "Keyword", description: "Exact match" },
];

const MEMORY_TYPES: {
  id: MemoryType;
  label: string;
  icon: keyof typeof Icons;
}[] = [
  { id: "semantic", label: "Semantic", icon: "BrainIcon" },
  { id: "episodic", label: "Episodic", icon: "Clock" },
  { id: "procedural", label: "Procedural", icon: "Settings2" },
];

const scopeCardVariants = cva(
  "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-memory)] bg-[var(--node-memory)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

const searchModeCardVariants = cva(
  "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border px-3 py-2 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-memory)] bg-[var(--node-memory)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

const typeToggleVariants = cva(
  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-memory)] bg-[var(--node-memory)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export const MemorySearchConfigPanel = memo(
  function MemorySearchConfigPanelComponent({
    config,
    onChange,
  }: MemorySearchConfigPanelProps) {
    const warnings = useMemo(() => {
      const list: string[] = [];
      if (!config.query?.trim()) {
        list.push("Query is required");
      }
      if ((config.topK ?? 10) <= 0) {
        list.push("Top K must be at least 1");
      }
      const threshold = config.threshold ?? 0.5;
      if (threshold < 0 || threshold > 1) {
        list.push("Threshold must be between 0 and 1");
      }
      if (config.dateRange?.start && config.dateRange?.end) {
        const start = Date.parse(config.dateRange.start);
        const end = Date.parse(config.dateRange.end);
        if (!(Number.isNaN(start) || Number.isNaN(end)) && start > end) {
          list.push("Date range start must be before end");
        }
      }
      return list;
    }, [
      config.dateRange?.end,
      config.dateRange?.start,
      config.query,
      config.threshold,
      config.topK,
    ]);

    const notes = useMemo(() => {
      const list: string[] = [];
      if (config.namespace?.trim()) {
        list.push("Namespace scoped");
      }
      if ((config.memoryTypes?.length ?? 0) > 0) {
        list.push(`${config.memoryTypes?.length ?? 0} memory types filtered`);
      }
      if ((config.tags?.length ?? 0) > 0) {
        list.push(`${config.tags?.length ?? 0} tags filtered`);
      }
      if (config.rerank) {
        list.push("Rerank enabled");
      }
      if (config.includeMetadata === false) {
        list.push("Metadata excluded from results");
      }
      if (config.searchMode === "keyword") {
        list.push("Keyword search ignores embeddings");
      }
      return list;
    }, [
      config.includeMetadata,
      config.memoryTypes?.length,
      config.namespace,
      config.rerank,
      config.searchMode,
      config.tags?.length,
    ]);

    return (
      <div className="divide-y divide-border/50">
        <QuerySection config={config} onChange={onChange} />
        <ScopeFiltersSection config={config} onChange={onChange} />
        <RetrievalSection config={config} onChange={onChange} />
        <OutputSection config={config} onChange={onChange} />
        <WarningsList items={warnings} />
        <NotesList items={notes} />
      </div>
    );
  }
);

MemorySearchConfigPanel.displayName = "MemorySearchConfigPanel";

interface SectionProps {
  config: MemorySearchNodeConfig;
  onChange: (config: Partial<MemorySearchNodeConfig>) => void;
}

const QuerySection = memo(function QuerySectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleSearchModeChange = useCallback(
    (searchMode: MemorySearchMode) => {
      onChange({ searchMode });
    },
    [onChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Search className="size-4" />}
      title="Query"
    >
      <div className="space-y-4">
        <ConfigField label="Search Query" tooltip="Query to search memories">
          <Input
            className="h-9"
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="e.g., user preferences for dark mode"
            value={config.query ?? ""}
          />
        </ConfigField>

        <ConfigField label="Search Mode" tooltip="How to match memories">
          <div className="flex gap-2">
            {SEARCH_MODES.map((mode) => (
              <button
                className={searchModeCardVariants({
                  selected: (config.searchMode ?? "hybrid") === mode.id,
                })}
                key={mode.id}
                onClick={() => handleSearchModeChange(mode.id)}
                type="button"
              >
                <span className="font-medium text-sm">{mode.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {mode.description}
                </span>
              </button>
            ))}
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const ScopeFiltersSection = memo(function ScopeFiltersSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleScopeChange = useCallback(
    (scope: MemoryScope) => {
      onChange({ scope });
    },
    [onChange]
  );

  const handleTypeToggle = useCallback(
    (type: MemoryType) => {
      const current = config.memoryTypes ?? [];
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      onChange({ memoryTypes: updated.length > 0 ? updated : undefined });
    },
    [config.memoryTypes, onChange]
  );

  const selectedTypesCount = config.memoryTypes?.length ?? 0;

  return (
    <ConfigSection
      badge={selectedTypesCount > 0 ? selectedTypesCount : "All"}
      defaultOpen
      icon={<Icons.Filter className="size-4" />}
      title="Scope & Filters"
    >
      <div className="space-y-4">
        <ConfigField label="Scope" tooltip="Memory scope to search">
          <div className="grid grid-cols-5 gap-1.5">
            {SCOPES.map((scope) => {
              const Icon = Icons[scope.icon];
              return (
                <button
                  className={scopeCardVariants({
                    selected: config.scope === scope.id,
                  })}
                  key={scope.id}
                  onClick={() => handleScopeChange(scope.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="font-medium text-[10px]">{scope.label}</span>
                </button>
              );
            })}
          </div>
        </ConfigField>

        <ConfigField label="Namespace" tooltip="Filter to specific namespace">
          <Input
            className="h-9"
            onChange={(e) =>
              onChange({ namespace: e.target.value || undefined })
            }
            placeholder="Optional namespace filter"
            value={config.namespace ?? ""}
          />
        </ConfigField>

        <ConfigField label="Memory Types" tooltip="Filter by memory type">
          <div className="flex flex-wrap gap-2">
            {MEMORY_TYPES.map((type) => {
              const Icon = Icons[type.icon];
              const isSelected = config.memoryTypes?.includes(type.id) ?? false;
              return (
                <button
                  className={typeToggleVariants({ selected: isSelected })}
                  key={type.id}
                  onClick={() => handleTypeToggle(type.id)}
                  type="button"
                >
                  <Icon className="size-3.5" />
                  <span className="text-sm">{type.label}</span>
                </button>
              );
            })}
          </div>
        </ConfigField>

        <ConfigField label="Tags" tooltip="Filter by tags (comma-separated)">
          <Input
            className="h-9"
            onChange={(e) => {
              const value = e.target.value;
              const tags = value
                ? value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : undefined;
              onChange({ tags });
            }}
            placeholder="e.g., preferences, important"
            value={config.tags?.join(", ") ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const RetrievalSection = memo(function RetrievalSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const rerankEnabled = config.rerank ?? false;

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Layers className="size-4" />}
      title="Retrieval Settings"
    >
      <div className="space-y-4">
        <ConfigField
          label="Top K"
          tooltip="Maximum number of results to return"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={100}
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
          label="Similarity Threshold"
          tooltip="Minimum similarity score (0-1)"
        >
          <div className="flex items-center gap-4">
            <Slider
              className="flex-1"
              max={1}
              min={0}
              onValueChange={(v) => onChange({ threshold: v[0] })}
              step={0.05}
              value={[config.threshold ?? 0.5]}
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums">
              {(config.threshold ?? 0.5).toFixed(2)}
            </span>
          </div>
        </ConfigField>

        <ConfigField
          horizontal
          label="Rerank Results"
          tooltip="Rerank results for better relevance"
        >
          <Switch
            checked={rerankEnabled}
            onCheckedChange={(rerank) => onChange({ rerank })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {rerankEnabled && (
            <div className="rounded-md border border-[var(--node-memory)]/30 bg-[var(--node-memory)]/5 px-3 py-2">
              <p className="text-muted-foreground text-xs">
                Results will be reranked using a cross-encoder model for
                improved relevance ordering.
              </p>
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

const OutputSection = memo(function OutputSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Settings2 className="size-4" />}
      title="Output"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Include Metadata"
          tooltip="Return metadata with each result"
        >
          <Switch
            checked={config.includeMetadata ?? true}
            onCheckedChange={(includeMetadata) => onChange({ includeMetadata })}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});
