"use client";

import type { SummarizeNodeConfig } from "@openbeam/types/canvas";
import { forwardRef, memo } from "react";
import {
  AdvancedSection,
  ChunkingSection,
  CitationsSection,
  FocusAreasSection,
  OutputFormatSection,
  StrategySection,
} from "./summarize-config-sections";

interface SummarizeConfigPanelProps {
  config: SummarizeNodeConfig;
  onChange: (config: Partial<SummarizeNodeConfig>) => void;
}

export const SummarizeConfigPanel = memo(
  forwardRef<HTMLDivElement, SummarizeConfigPanelProps>(
    function SummarizeConfigPanelComponent({ config, onChange }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <StrategySection config={config} onChange={onChange} />
          <OutputFormatSection config={config} onChange={onChange} />
          <FocusAreasSection config={config} onChange={onChange} />
          <CitationsSection config={config} onChange={onChange} />
          <ChunkingSection config={config} onChange={onChange} />
          <AdvancedSection config={config} onChange={onChange} />
        </div>
      );
    }
  )
);

SummarizeConfigPanel.displayName = "SummarizeConfigPanel";
