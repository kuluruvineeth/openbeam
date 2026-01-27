"use client";

import type { AnnotationNodeConfig } from "@openplane/types/canvas";
import { memo } from "react";
import {
  AppearanceSection,
  BehaviorSection,
  ContentSection,
  SizeSection,
} from "../../ai-elements/annotation-config-sections";

interface AnnotationConfigPanelProps {
  config: AnnotationNodeConfig;
  onChange: (config: Partial<AnnotationNodeConfig>) => void;
}

export const AnnotationConfigPanel = memo(
  function AnnotationConfigPanelComponent({
    config,
    onChange,
  }: AnnotationConfigPanelProps) {
    return (
      <div className="divide-y divide-border/50">
        <ContentSection config={config} onChange={onChange} />
        <AppearanceSection config={config} onChange={onChange} />
        <BehaviorSection config={config} onChange={onChange} />
        <SizeSection config={config} onChange={onChange} />
      </div>
    );
  }
);

AnnotationConfigPanel.displayName = "AnnotationConfigPanel";
