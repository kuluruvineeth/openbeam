"use client";

import type { RagNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Checkbox } from "../../../checkbox";
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
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const SEARCH_STRATEGIES = [
  { id: "hybrid", name: "Hybrid", description: "Semantic + keyword search" },
  { id: "semantic", name: "Semantic", description: "Vector similarity only" },
  { id: "keyword", name: "Keyword", description: "BM25 text matching" },
] as const;

const CONNECTOR_SOURCES = [
  { id: "slack", name: "Slack", logo: "slack" },
  { id: "notion", name: "Notion", logo: "notion" },
  { id: "google_drive", name: "Google Drive", logo: "google_drive" },
  { id: "gmail", name: "Gmail", logo: "gmail" },
  { id: "linear", name: "Linear", logo: "linear" },
  { id: "github", name: "GitHub", logo: "github" },
] as const;

interface RagConfigPanelProps {
  config: RagNodeConfig;
  onChange: (config: Partial<RagNodeConfig>) => void;
}

export const RagConfigPanel = memo(
  forwardRef<HTMLDivElement, RagConfigPanelProps>(
    function RagConfigPanelComponent({ config, onChange }, ref) {
      const handleSourceToggle = useCallback(
        (sourceId: string, checked: boolean) => {
          const current = config.connectorTypes ?? [];
          const updated = checked
            ? [...current, sourceId]
            : current.filter((s) => s !== sourceId);
          onChange({
            connectorTypes: updated.length > 0 ? updated : undefined,
          });
        },
        [config.connectorTypes, onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Search className="size-4" />}
            title="Retrieval"
          >
            <div className="space-y-4">
              <ConfigField label="Search Strategy" required>
                <Select
                  onValueChange={(type) =>
                    onChange({
                      searchType: type as RagNodeConfig["searchType"],
                    })
                  }
                  value={config.searchType ?? "hybrid"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_STRATEGIES.map((strategy) => (
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
                tooltip="Minimum similarity score (0-1)"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) => onChange({ minScore: v[0] })}
                    step={0.05}
                    value={[config.minScore ?? 0.5]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.minScore ?? 0.5).toFixed(2)}
                  </span>
                </div>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            badge={config.connectorTypes?.length ?? "All"}
            defaultOpen
            icon={<Icons.Database className="size-4" />}
            title="Sources"
          >
            <div className="space-y-2">
              {CONNECTOR_SOURCES.map((connector) => {
                const isChecked =
                  config.connectorTypes?.includes(connector.id) ?? false;
                const checkboxId = `source-${connector.id}`;
                return (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-secondary/50"
                    htmlFor={checkboxId}
                    key={connector.id}
                  >
                    <Checkbox
                      checked={isChecked}
                      id={checkboxId}
                      onCheckedChange={(checked) =>
                        handleSourceToggle(connector.id, checked === true)
                      }
                    />
                    <span className="text-sm">{connector.name}</span>
                  </label>
                );
              })}
              <p className="px-3 pt-2 text-muted-foreground text-xs">
                Leave all unchecked to search all connected sources.
              </p>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Advanced"
          >
            <div className="space-y-4">
              <ConfigField
                horizontal
                label="Reranking"
                tooltip="Rerank results for relevance"
              >
                <Switch
                  checked={config.rerank ?? true}
                  onCheckedChange={(rerank) => onChange({ rerank })}
                />
              </ConfigField>

              <ConfigField
                label="Custom Model"
                tooltip="Override model for RAG synthesis"
              >
                <Input
                  className="h-9"
                  onChange={(e) =>
                    onChange({ model: e.target.value || undefined })
                  }
                  placeholder="Default model"
                  value={config.model ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="System Prompt"
                tooltip="Custom instructions for synthesis"
              >
                <Input
                  className="h-9"
                  onChange={(e) =>
                    onChange({ systemPrompt: e.target.value || undefined })
                  }
                  placeholder="Use default RAG prompt"
                  value={config.systemPrompt ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

RagConfigPanel.displayName = "RagConfigPanel";
