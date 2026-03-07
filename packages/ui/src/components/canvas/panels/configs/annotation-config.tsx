"use client";

import type { AnnotationNodeConfig } from "@openbeam/types/canvas";
import { memo, useMemo } from "react";
import {
  AppearanceSection,
  BehaviorSection,
  ContentSection,
  SizeSection,
} from "../../ai-elements/annotation-config-sections";
import { NotesList } from "../feedback-lists";

interface AnnotationConfigPanelProps {
  config: AnnotationNodeConfig;
  onChange: (config: Partial<AnnotationNodeConfig>) => void;
}

function buildNotes(config: AnnotationNodeConfig): string[] {
  const notes: string[] = [];

  notes.push("Annotations are visual only and do not affect execution");

  if (!config.content?.trim()) {
    notes.push("Empty note");
  }

  if (config.isPinned) {
    notes.push("Pinned notes stay visible while panning");
  }

  if (config.isCollapsed) {
    notes.push("Collapsed notes show as an icon");
  }

  if (config.width && config.width > 360) {
    notes.push("Large notes can reduce canvas density");
  }

  if (config.height && config.height > 320) {
    notes.push("Tall notes may require scrolling");
  }

  return notes;
}

export const AnnotationConfigPanel = memo(
  function AnnotationConfigPanelComponent({
    config,
    onChange,
  }: AnnotationConfigPanelProps) {
    const notes = useMemo(() => buildNotes(config), [config]);

    return (
      <div className="divide-y divide-border/50">
        <ContentSection config={config} onChange={onChange} />
        <AppearanceSection config={config} onChange={onChange} />
        <BehaviorSection config={config} onChange={onChange} />
        <SizeSection config={config} onChange={onChange} />
        <NotesList items={notes} />
      </div>
    );
  }
);

AnnotationConfigPanel.displayName = "AnnotationConfigPanel";
