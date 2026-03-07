"use client";

import type {
  EntityType,
  ExtractionField,
  ExtractionTemplate,
} from "@openbeam/types/canvas";
import { memo, useCallback, useState } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { EntityTypeSelector } from "./entity-type-selector";
import {
  ExtractionTemplateSelector,
  TEMPLATE_DEFINITIONS,
} from "./extraction-template-selector";
import { FieldListEditor } from "./field-list-editor";

export interface SchemaModeSectionProps {
  fields: ExtractionField[];
  onChange: (fields: ExtractionField[]) => void;
  disabled?: boolean;
}

export const SchemaModeSection = memo(function SchemaModeSectionComponent({
  fields,
  onChange,
  disabled,
}: SchemaModeSectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.ListTree className="size-4" />}
      title="Schema Definition"
    >
      <div className="space-y-4">
        <ConfigField
          label="Fields"
          tooltip="Define the fields to extract from input content"
        >
          <FieldListEditor
            disabled={disabled}
            fields={fields}
            onChange={onChange}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

SchemaModeSection.displayName = "SchemaModeSection";

export interface TemplateModeSectionProps {
  template: ExtractionTemplate | undefined;
  customFields: ExtractionField[];
  onTemplateChange: (
    template: ExtractionTemplate,
    fields: ExtractionField[]
  ) => void;
  onFieldsChange: (fields: ExtractionField[]) => void;
  disabled?: boolean;
}

export const TemplateModeSection = memo(function TemplateModeSectionComponent({
  template,
  customFields,
  onTemplateChange,
  onFieldsChange,
  disabled,
}: TemplateModeSectionProps) {
  const [showCustomize, setShowCustomize] = useState(false);

  const handleTemplateSelect = useCallback(
    (templateId: ExtractionTemplate, fields: ExtractionField[]) => {
      onTemplateChange(templateId, fields);
      setShowCustomize(false);
    },
    [onTemplateChange]
  );

  const selectedTemplate = TEMPLATE_DEFINITIONS.find((t) => t.id === template);

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.FileText className="size-4" />}
      title="Template Selection"
    >
      <div className="space-y-4">
        <ConfigField
          label="Document Type"
          tooltip="Select a pre-built template for common document types"
        >
          <ExtractionTemplateSelector
            disabled={disabled}
            onChange={handleTemplateSelect}
            value={template}
          />
        </ConfigField>

        {selectedTemplate && (
          <>
            <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{selectedTemplate.name}</p>
                <p className="text-muted-foreground text-xs">
                  {selectedTemplate.fieldCount} fields ·{" "}
                  {selectedTemplate.fields.filter((f) => f.required).length}{" "}
                  required
                </p>
              </div>
              <Button
                className="h-7"
                onClick={() => setShowCustomize(!showCustomize)}
                size="sm"
                variant="outline"
              >
                <Icons.Pencil className="mr-1.5 size-3" />
                {showCustomize ? "Hide" : "Customize"}
              </Button>
            </div>

            <AnimatedSizeContainer height>
              {showCustomize && (
                <div className="pt-2">
                  <ConfigField
                    label="Customize Fields"
                    tooltip="Add, modify, or remove fields from the template"
                  >
                    <FieldListEditor
                      disabled={disabled}
                      fields={
                        customFields.length > 0
                          ? customFields
                          : selectedTemplate.fields
                      }
                      onChange={onFieldsChange}
                    />
                  </ConfigField>
                </div>
              )}
            </AnimatedSizeContainer>
          </>
        )}
      </div>
    </ConfigSection>
  );
});

TemplateModeSection.displayName = "TemplateModeSection";

export interface ExampleModeSectionProps {
  jsonExample: string;
  inferredFields: ExtractionField[];
  onExampleChange: (example: string) => void;
  onFieldsChange: (fields: ExtractionField[]) => void;
  disabled?: boolean;
}

export const ExampleModeSection = memo(function ExampleModeSectionComponent({
  jsonExample,
  inferredFields,
  onExampleChange,
  onFieldsChange,
  disabled,
}: ExampleModeSectionProps) {
  const [parseError, setParseError] = useState<string | null>(null);

  const handleExampleChange = useCallback(
    (value: string) => {
      onExampleChange(value);
      setParseError(null);

      if (!value.trim()) {
        onFieldsChange([]);
        return;
      }

      try {
        const parsed = JSON.parse(value);
        const fields = inferFieldsFromJson(parsed);
        onFieldsChange(fields);
      } catch {
        setParseError("Invalid JSON format");
      }
    },
    [onExampleChange, onFieldsChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Code className="size-4" />}
      title="JSON Example"
    >
      <div className="space-y-4">
        <ConfigField
          label="Example Output"
          tooltip="Paste an example JSON structure you want to extract"
        >
          <Textarea
            className="min-h-[160px] resize-y font-mono text-xs"
            disabled={disabled}
            onChange={(e) => handleExampleChange(e.target.value)}
            placeholder={`{
  "invoice_number": "INV-2024-001",
  "vendor": "Acme Corp",
  "amount": 1500.00,
  "items": [
    { "name": "Widget", "qty": 10 }
  ]
}`}
            value={jsonExample}
          />
        </ConfigField>

        {parseError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            <Icons.AlertCircle className="size-4 shrink-0" />
            {parseError}
          </div>
        )}

        {inferredFields.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Inferred {inferredFields.length} fields
              </span>
              <Button
                className="h-6 px-2 text-xs"
                onClick={() => onFieldsChange([])}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {inferredFields.map((field) => (
                <div
                  className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-xs"
                  key={field.id}
                >
                  <span className="font-medium">{field.name}</span>
                  <span className="text-muted-foreground"> ({field.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConfigSection>
  );
});

ExampleModeSection.displayName = "ExampleModeSection";

export interface NaturalModeSectionProps {
  prompt: string;
  onChange: (prompt: string) => void;
  disabled?: boolean;
}

export const NaturalModeSection = memo(function NaturalModeSectionComponent({
  prompt,
  onChange,
  disabled,
}: NaturalModeSectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.MessageSquare className="size-4" />}
      title="Natural Language"
    >
      <div className="space-y-4">
        <ConfigField
          label="Extraction Description"
          tooltip="Describe what you want to extract in plain language"
        >
          <Textarea
            className="min-h-[120px] resize-y"
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Extract the sender's name, email address, the main topic of the message, and any action items mentioned. Also identify any dates or deadlines."
            value={prompt}
          />
        </ConfigField>

        <div className="rounded-md border border-border/50 bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Icons.Lightbulb className="mt-0.5 size-4 text-amber-500" />
            <div className="space-y-1 text-xs">
              <p className="font-medium">Tips for better extraction:</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>Be specific about the information you need</li>
                <li>Mention expected data types (dates, numbers, lists)</li>
                <li>Describe the output structure if important</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
});

NaturalModeSection.displayName = "NaturalModeSection";

export interface EntityExtractionSectionProps {
  enabled: boolean;
  entityTypes: EntityType[];
  onEnabledChange: (enabled: boolean) => void;
  onTypesChange: (types: EntityType[]) => void;
  disabled?: boolean;
}

export const EntityExtractionSection = memo(
  function EntityExtractionSectionComponent({
    enabled,
    entityTypes,
    onEnabledChange,
    onTypesChange,
    disabled,
  }: EntityExtractionSectionProps) {
    return (
      <ConfigSection
        defaultOpen={enabled}
        icon={<Icons.Tags className="size-4" />}
        title="Entity Recognition"
      >
        <div className="space-y-4">
          <ConfigField
            label="Enable NER"
            tooltip="Also extract named entities from the content"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Extract named entities
              </span>
              <Switch
                checked={enabled}
                disabled={disabled}
                onCheckedChange={onEnabledChange}
              />
            </div>
          </ConfigField>

          <AnimatedSizeContainer height>
            {enabled && (
              <div className="pt-2">
                <ConfigField
                  label="Entity Types"
                  tooltip="Select which entity types to recognize"
                >
                  <EntityTypeSelector
                    disabled={disabled}
                    onChange={onTypesChange}
                    value={entityTypes}
                  />
                </ConfigField>
              </div>
            )}
          </AnimatedSizeContainer>
        </div>
      </ConfigSection>
    );
  }
);

EntityExtractionSection.displayName = "EntityExtractionSection";

export interface AdvancedExtractSectionProps {
  temperature: number;
  strictMode: boolean;
  includeConfidence: boolean;
  handleArrays: "first" | "all" | "merge";
  nullHandling: "omit" | "null" | "default";
  onTemperatureChange: (temp: number) => void;
  onStrictModeChange: (strict: boolean) => void;
  onIncludeConfidenceChange: (include: boolean) => void;
  onHandleArraysChange: (handle: "first" | "all" | "merge") => void;
  onNullHandlingChange: (handling: "omit" | "null" | "default") => void;
  disabled?: boolean;
}

export const AdvancedExtractSection = memo(
  function AdvancedExtractSectionComponent({
    temperature,
    strictMode,
    includeConfidence,
    handleArrays,
    nullHandling,
    onTemperatureChange,
    onStrictModeChange,
    onIncludeConfidenceChange,
    onHandleArraysChange,
    onNullHandlingChange,
    disabled,
  }: AdvancedExtractSectionProps) {
    return (
      <ConfigSection
        defaultOpen={false}
        icon={<Icons.Settings2 className="size-4" />}
        title="Advanced Options"
      >
        <div className="space-y-4">
          <ConfigField
            label="Temperature"
            tooltip="Lower values for more deterministic extraction"
          >
            <div className="flex items-center gap-4">
              <input
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted"
                disabled={disabled}
                max={1}
                min={0}
                onChange={(e) =>
                  onTemperatureChange(Number.parseFloat(e.target.value))
                }
                step={0.1}
                type="range"
                value={temperature}
              />
              <span className="w-10 text-right font-mono text-sm tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
          </ConfigField>

          <ConfigField
            label="Strict Mode"
            tooltip="Fail if extraction doesn't match schema exactly"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Enforce strict schema validation
              </span>
              <Switch
                checked={strictMode}
                disabled={disabled}
                onCheckedChange={onStrictModeChange}
              />
            </div>
          </ConfigField>

          <ConfigField
            label="Include Confidence"
            tooltip="Add confidence scores to extracted values"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Output confidence scores
              </span>
              <Switch
                checked={includeConfidence}
                disabled={disabled}
                onCheckedChange={onIncludeConfidenceChange}
              />
            </div>
          </ConfigField>

          <ConfigField
            label="Array Handling"
            tooltip="How to handle multiple matches for a field"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {(["first", "all", "merge"] as const).map((option) => (
                <button
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    handleArrays === option
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 hover:border-border hover:bg-muted/50"
                  }`}
                  disabled={disabled}
                  key={option}
                  onClick={() => onHandleArraysChange(option)}
                  type="button"
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </ConfigField>

          <ConfigField
            label="Null Handling"
            tooltip="How to handle missing or null values"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {(["omit", "null", "default"] as const).map((option) => (
                <button
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    nullHandling === option
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 hover:border-border hover:bg-muted/50"
                  }`}
                  disabled={disabled}
                  key={option}
                  onClick={() => onNullHandlingChange(option)}
                  type="button"
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </ConfigField>
        </div>
      </ConfigSection>
    );
  }
);

AdvancedExtractSection.displayName = "AdvancedExtractSection";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;
const EMAIL_REGEX = /^[\w.-]+@[\w.-]+\.\w+$/;
const URL_REGEX = /^https?:\/\//;
const PHONE_REGEX = /^\+?[\d\s()-]+$/;
const CURRENCY_REGEX = /^\$|USD|EUR|GBP/i;

function getFieldTypeFromValue(value: unknown): ExtractionField["type"] {
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "string") {
    return inferStringType(value);
  }
  return "string";
}

function inferStringType(value: string): ExtractionField["type"] {
  if (DATE_REGEX.test(value)) {
    return "date";
  }
  if (EMAIL_REGEX.test(value)) {
    return "email";
  }
  if (URL_REGEX.test(value)) {
    return "url";
  }
  if (PHONE_REGEX.test(value) && value.length >= 7) {
    return "phone";
  }
  if (CURRENCY_REGEX.test(value)) {
    return "currency";
  }
  return "string";
}

function formatFieldName(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function createField(
  key: string,
  prefix: string,
  type: ExtractionField["type"]
): ExtractionField {
  const fieldId = prefix ? `${prefix}_${key}` : key;
  return {
    id: fieldId,
    name: formatFieldName(key),
    type,
    required: false,
  };
}

function processObjectEntry(
  key: string,
  value: unknown,
  prefix: string
): ExtractionField {
  if (Array.isArray(value)) {
    return createField(key, prefix, "array");
  }
  if (typeof value === "object" && value !== null) {
    return createField(key, prefix, "object");
  }
  return createField(key, prefix, getFieldTypeFromValue(value));
}

function inferFieldsFromJson(obj: unknown, prefix = ""): ExtractionField[] {
  if (obj === null || obj === undefined) {
    return [];
  }

  if (Array.isArray(obj)) {
    return obj.length > 0 ? inferFieldsFromJson(obj[0], prefix) : [];
  }

  if (typeof obj !== "object") {
    return [];
  }

  return Object.entries(obj).map(([key, value]) =>
    processObjectEntry(key, value, prefix)
  );
}
