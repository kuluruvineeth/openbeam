"use client";

import type { TemplateNodeConfig } from "@openbeam/types/canvas";
import { forwardRef, memo, useMemo } from "react";
import {
  AdvancedSection,
  OutputSection,
  PresetsSection,
  PreviewSection,
  TemplateEditorSection,
  VariablesSection,
} from "../../ai-elements/template-config-sections";
import { validateTemplate } from "../../ai-elements/template-variable-detector";
import { NotesList, WarningsList } from "../feedback-lists";

interface TemplateConfigPanelProps {
  config: TemplateNodeConfig;
  onChange: (config: Partial<TemplateNodeConfig>) => void;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function buildWarnings(config: TemplateNodeConfig): string[] {
  const warnings: string[] = [];
  const template = config.template ?? "";
  const syntax = config.syntax ?? "handlebars";
  const variables = config.variables ?? [];

  if (!template.trim()) {
    warnings.push("Template is empty");
  }

  const validation = validateTemplate(template, syntax);
  if (!validation.valid) {
    warnings.push(...validation.errors);
  }

  const names = variables.map((variable) => normalizeName(variable.name));
  if (names.some((name) => !name)) {
    warnings.push("Fill in variable names");
  }
  const uniqueNames = new Set(names.filter(Boolean));
  if (uniqueNames.size !== names.filter(Boolean).length) {
    warnings.push("Duplicate variable names detected");
  }

  const validationEnabled = config.validation?.enabled ?? true;
  if (
    config.outputFormat === "json" &&
    (config.validation?.validateJson ?? false) &&
    !validationEnabled
  ) {
    warnings.push("JSON validation is disabled");
  }

  return warnings;
}

function buildNotes(config: TemplateNodeConfig): string[] {
  const notes: string[] = [];
  const validationEnabled = config.validation?.enabled ?? true;

  if (!validationEnabled) {
    notes.push("Validation is disabled");
  }
  if (config.validation?.strict) {
    notes.push("Strict mode requires all variables");
  }
  if (
    config.outputFormat === "json" &&
    !(config.validation?.validateJson ?? false)
  ) {
    notes.push("JSON output is not validated");
  }
  if (config.validation?.maxOutputLength) {
    notes.push(`Max output length: ${config.validation.maxOutputLength} chars`);
  }
  if (config.undefinedVariable === "placeholder") {
    notes.push("Missing variables keep placeholders");
  }
  if (config.fallbackBehavior === "preserve") {
    notes.push("Errors return the template output");
  }
  if (config.fallbackBehavior === "empty") {
    notes.push("Errors return an empty output");
  }
  if (config.escapeHtml) {
    notes.push("HTML escaping is enabled");
  }

  return notes;
}

export const TemplateConfigPanel = memo(
  forwardRef<HTMLDivElement, TemplateConfigPanelProps>(
    function TemplateConfigPanelComponent({ config, onChange }, ref) {
      const warnings = useMemo(() => buildWarnings(config), [config]);
      const notes = useMemo(() => buildNotes(config), [config]);

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <TemplateEditorSection config={config} onChange={onChange} />
          <VariablesSection config={config} onChange={onChange} />
          <PreviewSection config={config} onChange={onChange} />
          <PresetsSection config={config} onChange={onChange} />
          <OutputSection config={config} onChange={onChange} />
          <AdvancedSection config={config} onChange={onChange} />
          <WarningsList items={warnings} />
          <NotesList items={notes} />
        </div>
      );
    }
  )
);

TemplateConfigPanel.displayName = "TemplateConfigPanel";
