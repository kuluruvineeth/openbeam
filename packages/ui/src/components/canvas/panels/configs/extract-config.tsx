"use client";

import { DEFAULT_CHAT_MODEL } from "@openplane/types/ai";
import type {
  ExtractionField,
  ExtractionMode,
  ExtractionTemplate,
  ExtractNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { ModelSelector } from "../../ai-elements";
import {
  AdvancedExtractSection,
  EntityExtractionSection,
  ExampleModeSection,
  NaturalModeSection,
  SchemaModeSection,
  TemplateModeSection,
} from "../../ai-elements/extract-config-sections";
import { ExtractionModeSelector } from "../../ai-elements/extraction-mode-selector";
import { TEMPLATE_DEFINITIONS } from "../../ai-elements/extraction-template-selector";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface ExtractConfigPanelProps {
  config: ExtractNodeConfig;
  onChange: (config: Partial<ExtractNodeConfig>) => void;
}

interface ModeSectionProps {
  config: ExtractNodeConfig;
  mode: ExtractionMode;
  onChange: (config: Partial<ExtractNodeConfig>) => void;
}

function hasIncompleteFields(fields: ExtractionField[]): boolean {
  return fields.some((field) => !(field.name.trim() && field.id.trim()));
}

function resolveActiveFields(config: ExtractNodeConfig): ExtractionField[] {
  const mode = config.mode ?? "schema";
  if (mode === "schema") {
    return config.fields ?? [];
  }
  if (mode === "template") {
    if (config.customTemplate?.fields?.length) {
      return config.customTemplate.fields;
    }
    if (config.fields?.length) {
      return config.fields;
    }
    if (config.template) {
      return (
        TEMPLATE_DEFINITIONS.find((t) => t.id === config.template)?.fields ?? []
      );
    }
    return [];
  }
  if (mode === "example") {
    return config.inferredSchema ?? [];
  }
  return [];
}

function buildModeWarnings(config: ExtractNodeConfig): string[] {
  const warnings: string[] = [];
  const mode = config.mode ?? "schema";
  const activeFields = resolveActiveFields(config);

  if (mode === "schema") {
    if ((config.fields?.length ?? 0) === 0) {
      warnings.push("Add at least one field");
    }
    if (hasIncompleteFields(config.fields ?? [])) {
      warnings.push("Fill in field names");
    }
  }

  if (mode === "template") {
    const hasTemplate = Boolean(config.template);
    const hasCustomFields = (config.customTemplate?.fields?.length ?? 0) > 0;
    const hasFields = (config.fields?.length ?? 0) > 0;
    if (!(hasTemplate || hasCustomFields || hasFields)) {
      warnings.push("Select a template or add custom fields");
    }
    if (activeFields.length > 0 && hasIncompleteFields(activeFields)) {
      warnings.push("Fill in field names");
    }
  }

  if (mode === "example") {
    if (!config.jsonExample?.trim()) {
      warnings.push("Provide a JSON example to infer fields");
    } else if ((config.inferredSchema?.length ?? 0) === 0) {
      warnings.push("Example did not infer any fields");
    }
  }

  if (mode === "natural" && !config.extractionPrompt?.trim()) {
    warnings.push("Describe what to extract");
  }

  return warnings;
}

function buildModeNotes(config: ExtractNodeConfig): string[] {
  const notes: string[] = [];

  if (config.customTemplate?.fields?.length) {
    notes.push("Custom fields override template defaults");
  }
  if (config.extractEntities && (config.entityTypes?.length ?? 0) === 0) {
    notes.push("NER includes all entity types");
  }
  if (!config.strictMode) {
    notes.push("Raw model output is retained for inspection");
  }
  if (config.includeConfidence) {
    notes.push("Confidence scores are included in the output");
  }

  return notes;
}

function ModeSection({ config, mode, onChange }: ModeSectionProps) {
  const handleTemplateFieldsChange = useCallback(
    (fields: ExtractionField[]) => {
      onChange({
        customTemplate: config.customTemplate
          ? { ...config.customTemplate, fields }
          : { name: "Custom", fields },
      });
    },
    [config.customTemplate, onChange]
  );

  const handleTemplateChange = useCallback(
    (template: ExtractionTemplate, fields: ExtractionField[]) => {
      onChange({ template, fields });
    },
    [onChange]
  );

  switch (mode) {
    case "schema":
      return (
        <SchemaModeSection
          fields={config.fields ?? []}
          onChange={(fields) => onChange({ fields })}
        />
      );
    case "template":
      return (
        <TemplateModeSection
          customFields={config.customTemplate?.fields ?? []}
          onFieldsChange={handleTemplateFieldsChange}
          onTemplateChange={handleTemplateChange}
          template={config.template}
        />
      );
    case "example":
      return (
        <ExampleModeSection
          inferredFields={config.inferredSchema ?? []}
          jsonExample={config.jsonExample ?? ""}
          onExampleChange={(jsonExample) => onChange({ jsonExample })}
          onFieldsChange={(inferredSchema) => onChange({ inferredSchema })}
        />
      );
    case "natural":
      return (
        <NaturalModeSection
          onChange={(extractionPrompt) => onChange({ extractionPrompt })}
          prompt={config.extractionPrompt ?? ""}
        />
      );
    default:
      return null;
  }
}

export const ExtractConfigPanel = memo(
  forwardRef<HTMLDivElement, ExtractConfigPanelProps>(
    function ExtractConfigPanelComponent({ config, onChange }, ref) {
      const mode = config.mode ?? "schema";
      const modelValue = config.model?.trim() || DEFAULT_CHAT_MODEL;
      const warnings = useMemo(() => buildModeWarnings(config), [config]);
      const notes = useMemo(() => buildModeNotes(config), [config]);

      const handleModeChange = useCallback(
        (newMode: ExtractionMode) => {
          onChange({ mode: newMode });
        },
        [onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Layers className="size-4" />}
            title="Extraction Mode"
          >
            <div className="space-y-4">
              <ConfigField
                label="Mode"
                tooltip="Choose how to define the extraction schema"
              >
                <ExtractionModeSelector
                  onChange={handleModeChange}
                  value={mode}
                />
              </ConfigField>

              <ConfigField label="Model">
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="chat"
                  value={modelValue}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <AnimatedSizeContainer height>
            <ModeSection config={config} mode={mode} onChange={onChange} />
          </AnimatedSizeContainer>
          <WarningsList items={warnings} />
          <NotesList items={notes} />

          <EntityExtractionSection
            enabled={config.extractEntities ?? false}
            entityTypes={config.entityTypes ?? []}
            onEnabledChange={(extractEntities) => onChange({ extractEntities })}
            onTypesChange={(entityTypes) => onChange({ entityTypes })}
          />

          <AdvancedExtractSection
            handleArrays={config.handleArrays ?? "all"}
            includeConfidence={config.includeConfidence ?? false}
            nullHandling={config.nullHandling ?? "omit"}
            onHandleArraysChange={(handleArrays) => onChange({ handleArrays })}
            onIncludeConfidenceChange={(includeConfidence) =>
              onChange({ includeConfidence })
            }
            onNullHandlingChange={(nullHandling) => onChange({ nullHandling })}
            onStrictModeChange={(strictMode) => onChange({ strictMode })}
            onTemperatureChange={(temperature) => onChange({ temperature })}
            strictMode={config.strictMode ?? true}
            temperature={config.temperature ?? 0.1}
          />
        </div>
      );
    }
  )
);

ExtractConfigPanel.displayName = "ExtractConfigPanel";
