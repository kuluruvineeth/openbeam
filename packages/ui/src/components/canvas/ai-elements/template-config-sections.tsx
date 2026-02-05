"use client";

import type {
  TemplateNodeConfig,
  TemplateOutputFormat,
  TemplatePreset,
  TemplateSyntax,
  TemplateVariable,
} from "@openplane/types/canvas";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../../utils";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Switch } from "../../switch";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { TemplateEditor } from "./template-editor";
import { TemplateOutputFormatSelector } from "./template-output-format-selector";
import { getPresetById } from "./template-preset-definitions";
import { TemplatePresetSelector } from "./template-preset-selector";
import { TemplatePreviewPane } from "./template-preview-pane";
import { TemplateSyntaxSelector } from "./template-syntax-selector";
import {
  detectVariables,
  validateTemplate,
} from "./template-variable-detector";
import { TemplateVariableList } from "./template-variable-list";

interface SectionProps {
  config: TemplateNodeConfig;
  onChange: (config: Partial<TemplateNodeConfig>) => void;
}

export const TemplateEditorSection = memo(
  function TemplateEditorSectionComponent({ config, onChange }: SectionProps) {
    const syntax = config.syntax ?? "handlebars";
    const template = config.template ?? "";

    const validation = useMemo(
      () => validateTemplate(template, syntax),
      [template, syntax]
    );

    const handleTemplateChange = useCallback(
      (newTemplate: string) => {
        const detected = detectVariables(newTemplate, syntax);
        const existingManual = (config.variables ?? []).filter(
          (v) => v.source === "manual"
        );
        const merged = [...detected, ...existingManual];
        onChange({ template: newTemplate, variables: merged });
      },
      [syntax, config.variables, onChange]
    );

    const handleSyntaxChange = useCallback(
      (newSyntax: TemplateSyntax) => {
        const detected = detectVariables(template, newSyntax);
        const existingManual = (config.variables ?? []).filter(
          (v) => v.source === "manual"
        );
        onChange({
          syntax: newSyntax,
          variables: [...detected, ...existingManual],
        });
      },
      [config.variables, onChange, template]
    );

    return (
      <ConfigSection
        badge={syntax}
        defaultOpen
        icon={<Icons.FileText className="size-4" />}
        title="Template"
      >
        <div className="space-y-4">
          <ConfigField label="Syntax" tooltip="Template engine syntax">
            <TemplateSyntaxSelector
              onChange={handleSyntaxChange}
              value={syntax}
            />
          </ConfigField>

          <ConfigField label="Template" required>
            <TemplateEditor
              minHeight={180}
              onChange={handleTemplateChange}
              syntax={syntax}
              value={template}
            />
          </ConfigField>

          <AnimatedSizeContainer height>
            {!validation.valid && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                {validation.errors.map((error) => (
                  <div
                    className="flex items-center gap-2 text-destructive text-xs"
                    key={error}
                  >
                    <Icons.AlertCircle className="size-3" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
          </AnimatedSizeContainer>
        </div>
      </ConfigSection>
    );
  }
);

TemplateEditorSection.displayName = "TemplateEditorSection";

export const VariablesSection = memo(function VariablesSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const variables = config.variables ?? [];

  const handleVariablesChange = useCallback(
    (newVariables: TemplateVariable[]) => {
      onChange({ variables: newVariables });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={variables.length > 0 ? variables.length : undefined}
      defaultOpen
      icon={<Icons.Braces className="size-4" />}
      title="Variables"
    >
      <TemplateVariableList
        onChange={handleVariablesChange}
        variables={variables}
      />
    </ConfigSection>
  );
});

VariablesSection.displayName = "VariablesSection";

export const PresetsSection = memo(function PresetsSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handlePresetSelect = useCallback(
    (presetId: TemplatePreset) => {
      const preset = getPresetById(presetId);
      if (!preset) {
        return;
      }

      onChange({
        preset: presetId,
        template: preset.template,
        variables: preset.variables,
        outputFormat: preset.outputFormat,
      });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={config.preset ? getPresetById(config.preset)?.name : undefined}
      defaultOpen={false}
      icon={<Icons.Layers className="size-4" />}
      title="Presets"
    >
      <TemplatePresetSelector
        onChange={handlePresetSelect}
        value={config.preset}
      />
    </ConfigSection>
  );
});

PresetsSection.displayName = "PresetsSection";

function getSampleValue(type: TemplateVariable["type"]): unknown {
  switch (type) {
    case "number":
      return 42;
    case "boolean":
      return true;
    case "array":
      return ["item1", "item2"];
    case "object":
      return { key: "value" };
    default:
      return "sample";
  }
}

export const PreviewSection = memo(function PreviewSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const [testData, setTestData] = useState<Record<string, unknown>>(
    config.testData ?? {}
  );

  const variables = config.variables ?? [];

  useEffect(() => {
    const newTestData: Record<string, unknown> = { ...testData };
    let changed = false;

    for (const variable of variables) {
      if (!(variable.name in newTestData)) {
        newTestData[variable.name] =
          variable.defaultValue ?? getSampleValue(variable.type);
        changed = true;
      }
    }

    if (changed) {
      setTestData(newTestData);
      onChange({ testData: newTestData });
    }
  }, [variables, testData, onChange]);

  const handleTestDataChange = useCallback(
    (key: string, value: string) => {
      const updated = { ...testData, [key]: value };
      setTestData(updated);
      onChange({ testData: updated });
    },
    [testData, onChange]
  );

  const validation = useMemo(
    () =>
      validateTemplate(config.template ?? "", config.syntax ?? "handlebars"),
    [config.template, config.syntax]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Eye className="size-4" />}
      title="Preview"
    >
      <div className="space-y-4">
        {variables.length > 0 && (
          <ConfigField label="Test Data">
            <div className="space-y-2 rounded-md border border-border/50 p-2">
              {variables.map((variable) => (
                <div className="flex items-center gap-2" key={variable.id}>
                  <span className="w-24 truncate font-mono text-muted-foreground text-xs">
                    {variable.name}
                  </span>
                  <Input
                    className="h-7 flex-1 font-mono text-xs"
                    onChange={(e) =>
                      handleTestDataChange(variable.name, e.target.value)
                    }
                    placeholder={`Enter ${variable.name}...`}
                    value={String(testData[variable.name] ?? "")}
                  />
                </div>
              ))}
            </div>
          </ConfigField>
        )}

        <TemplatePreviewPane
          error={validation.valid ? undefined : validation.errors[0]}
          outputFormat={config.outputFormat ?? "text"}
          template={config.template ?? ""}
          testData={testData}
          variables={variables}
        />
      </div>
    </ConfigSection>
  );
});

PreviewSection.displayName = "PreviewSection";

export const OutputSection = memo(function OutputSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const outputFormat = config.outputFormat ?? "text";
  const validationEnabled = config.validation?.enabled ?? true;

  const handleFormatChange = useCallback(
    (format: TemplateOutputFormat) => {
      onChange({ outputFormat: format });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={outputFormat}
      defaultOpen={false}
      icon={<Icons.FileExport className="size-4" />}
      title="Output"
    >
      <div className="space-y-4">
        <ConfigField label="Format">
          <TemplateOutputFormatSelector
            onChange={handleFormatChange}
            value={outputFormat}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {outputFormat === "json" && (
            <ConfigField
              horizontal
              label="Validate JSON"
              tooltip="Ensure output is valid JSON"
            >
              <Switch
                checked={config.validation?.validateJson ?? false}
                disabled={!validationEnabled}
                onCheckedChange={(validateJson) =>
                  onChange({
                    validation: { ...config.validation, validateJson },
                  })
                }
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>

        {!validationEnabled && outputFormat === "json" && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
            <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>Enable validation to enforce JSON output</span>
          </div>
        )}

        <ConfigField
          horizontal
          label="Trim Whitespace"
          tooltip="Remove leading/trailing whitespace"
        >
          <Switch
            checked={config.trimWhitespace ?? true}
            onCheckedChange={(trimWhitespace) => onChange({ trimWhitespace })}
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Preserve Newlines"
          tooltip="Keep line breaks in output"
        >
          <Switch
            checked={config.preserveNewlines ?? true}
            onCheckedChange={(preserveNewlines) =>
              onChange({ preserveNewlines })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

OutputSection.displayName = "OutputSection";

export const AdvancedSection = memo(function AdvancedSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const validationEnabled = config.validation?.enabled ?? true;
  const strictMode = config.validation?.strict ?? false;
  const maxOutputLength = config.validation?.maxOutputLength;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Settings2 className="size-4" />}
      title="Advanced"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Validation"
          tooltip="Enable output validation rules"
        >
          <Switch
            checked={validationEnabled}
            onCheckedChange={(enabled) =>
              onChange({
                validation: { ...config.validation, enabled },
              })
            }
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Strict Mode"
          tooltip="Throw errors for missing required variables"
        >
          <Switch
            checked={strictMode}
            onCheckedChange={(strict) =>
              onChange({
                validation: { ...config.validation, strict },
              })
            }
          />
        </ConfigField>

        <ConfigField
          label="Max Output Length"
          tooltip="Maximum characters allowed in output"
        >
          <Input
            className="h-9 font-mono"
            disabled={!validationEnabled}
            min={1}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onChange({
                validation: {
                  ...config.validation,
                  maxOutputLength: Number.isNaN(parsed) ? undefined : parsed,
                },
              });
            }}
            placeholder="Unlimited"
            type="number"
            value={maxOutputLength ?? ""}
          />
        </ConfigField>

        {!validationEnabled && (
          <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground text-xs">
            <Icons.Info className="mt-0.5 size-3.5 shrink-0" />
            <span>Output length and JSON validation are skipped</span>
          </div>
        )}

        <ConfigField
          horizontal
          label="Escape HTML"
          tooltip="Escape HTML entities in output"
        >
          <Switch
            checked={config.escapeHtml ?? false}
            onCheckedChange={(escapeHtml) => onChange({ escapeHtml })}
          />
        </ConfigField>

        <ConfigField
          label="Undefined Variable"
          tooltip="Behavior when variable is missing"
        >
          <div className="grid grid-cols-3 gap-2">
            {(["empty", "error", "placeholder"] as const).map((behavior) => (
              <button
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  config.undefinedVariable === behavior
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:bg-muted/50"
                )}
                key={behavior}
                onClick={() => onChange({ undefinedVariable: behavior })}
                type="button"
              >
                {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
              </button>
            ))}
          </div>
        </ConfigField>

        <ConfigField
          label="Fallback Behavior"
          tooltip="Behavior on template errors"
        >
          <div className="grid grid-cols-3 gap-2">
            {(["empty", "error", "preserve"] as const).map((behavior) => (
              <button
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  config.fallbackBehavior === behavior
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:bg-muted/50"
                )}
                key={behavior}
                onClick={() => onChange({ fallbackBehavior: behavior })}
                type="button"
              >
                {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
              </button>
            ))}
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

AdvancedSection.displayName = "AdvancedSection";
