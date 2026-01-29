"use client";

import type {
  ExtractionField,
  ExtractionMode,
  ExtractionTemplate,
  ExtractNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
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
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface ExtractConfigPanelProps {
  config: ExtractNodeConfig;
  onChange: (config: Partial<ExtractNodeConfig>) => void;
}

interface ModeSectionProps {
  config: ExtractNodeConfig;
  mode: ExtractionMode;
  onChange: (config: Partial<ExtractNodeConfig>) => void;
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
                  value={config.model ?? "claude-sonnet-4-20250514"}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <AnimatedSizeContainer height>
            <ModeSection config={config} mode={mode} onChange={onChange} />
          </AnimatedSizeContainer>

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
