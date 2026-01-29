"use client";

import type { RagNodeConfig } from "@openplane/types/canvas";
import type { ConnectorType } from "@openplane/types/services/connectors/events";
import type { ComponentType } from "react";
import { forwardRef, memo } from "react";
import type { ConnectorSource } from "../../ai-elements";
import type { LogoProps } from "../../event-builder";
import {
  ChunkingSection,
  KnowledgeSourcesSection,
  PostProcessingSection,
  QueryEnhancementSection,
  RetrievalSettingsSection,
  SearchStrategySection,
  SynthesisSection,
} from "./rag-config-sections";

const DEFAULT_SOURCES: ConnectorSource[] = [
  { id: "slack", name: "Slack" },
  { id: "notion", name: "Notion" },
  { id: "google-drive", name: "Google Drive" },
  { id: "gmail", name: "Gmail" },
  { id: "linear", name: "Linear" },
];

interface RagConfigPanelProps {
  config: RagNodeConfig;
  onChange: (config: Partial<RagNodeConfig>) => void;
  availableSources?: ConnectorSource[];
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
}

export const RagConfigPanel = memo(
  forwardRef<HTMLDivElement, RagConfigPanelProps>(
    function RagConfigPanelComponent(
      { config, onChange, availableSources = DEFAULT_SOURCES, connectorLogos },
      ref
    ) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <SearchStrategySection config={config} onChange={onChange} />
          <RetrievalSettingsSection config={config} onChange={onChange} />
          <KnowledgeSourcesSection
            availableSources={availableSources}
            config={config}
            connectorLogos={connectorLogos}
            onChange={onChange}
          />
          <SynthesisSection config={config} onChange={onChange} />
          <QueryEnhancementSection config={config} onChange={onChange} />
          <ChunkingSection config={config} onChange={onChange} />
          <PostProcessingSection config={config} onChange={onChange} />
        </div>
      );
    }
  )
);

RagConfigPanel.displayName = "RagConfigPanel";
