"use client";

import type { TemplateNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo } from "react";
import {
  AdvancedSection,
  OutputSection,
  PresetsSection,
  PreviewSection,
  TemplateEditorSection,
  VariablesSection,
} from "../../ai-elements/template-config-sections";

interface TemplateConfigPanelProps {
  config: TemplateNodeConfig;
  onChange: (config: Partial<TemplateNodeConfig>) => void;
}

export const TemplateConfigPanel = memo(
  forwardRef<HTMLDivElement, TemplateConfigPanelProps>(
    function TemplateConfigPanelComponent({ config, onChange }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <TemplateEditorSection config={config} onChange={onChange} />
          <VariablesSection config={config} onChange={onChange} />
          <PreviewSection config={config} onChange={onChange} />
          <PresetsSection config={config} onChange={onChange} />
          <OutputSection config={config} onChange={onChange} />
          <AdvancedSection config={config} onChange={onChange} />
        </div>
      );
    }
  )
);

TemplateConfigPanel.displayName = "TemplateConfigPanel";
