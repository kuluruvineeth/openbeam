"use client";

import type {
  NodeStatus,
  Port,
  TemplateNodeConfig,
  TemplateVariable,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { validateTemplate } from "../../ai-elements/template-variable-detector";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface TemplateNodeData {
  label: string;
  config: TemplateNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  preview?: string;
  [key: string]: unknown;
}

type TemplateNodeType = Node<TemplateNodeData, "template">;

const FORMAT_LABELS: Record<string, string> = {
  text: "Plain Text",
  json: "JSON",
  markdown: "Markdown",
  html: "HTML",
  xml: "XML",
};

const SYNTAX_LABELS: Record<string, string> = {
  handlebars: "Handlebars",
  mustache: "Mustache",
  ejs: "EJS",
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function hasInvalidVariableNames(variables: TemplateVariable[]): boolean {
  return variables.some((variable) => !variable.name.trim());
}

function hasDuplicateVariableNames(variables: TemplateVariable[]): boolean {
  const names = variables.map((variable) => normalizeName(variable.name));
  const filtered = names.filter(Boolean);
  return new Set(filtered).size !== filtered.length;
}

export const TemplateNode = memo(
  forwardRef<HTMLDivElement, NodeProps<TemplateNodeType>>(
    function TemplateNodeComponent({ data, selected }, ref) {
      const config = data.config;
      const syntax = config.syntax ?? "handlebars";
      const outputFormat = config.outputFormat ?? "text";
      const template = config.template ?? "";
      const variables = config.variables ?? [];
      const validationEnabled = config.validation?.enabled ?? true;
      const validationStrict = config.validation?.strict ?? false;
      const validateJson = config.validation?.validateJson ?? false;
      const maxOutputLength = config.validation?.maxOutputLength;

      const variableCount = variables.length;
      const requiredCount = variables.filter((v) => v.required).length;

      const templatePreview = useMemo(() => {
        if (!template) {
          return "";
        }
        const lines = template.split("\n");
        const firstLine = lines[0]?.slice(0, 50) ?? "";
        return lines.length > 1 ? `${firstLine}...` : firstLine;
      }, [template]);

      const hasTemplate = template.length > 0;
      const validation = useMemo(
        () => validateTemplate(template, syntax),
        [template, syntax]
      );

      const warnings = useMemo(() => {
        const items: string[] = [];
        if (!template.trim()) {
          items.push("Template is empty");
        }
        if (!validation.valid) {
          items.push(...validation.errors);
        }
        if (hasInvalidVariableNames(variables)) {
          items.push("Fill in variable names");
        }
        if (hasDuplicateVariableNames(variables)) {
          items.push("Duplicate variable names detected");
        }
        if (outputFormat === "json" && validateJson && !validationEnabled) {
          items.push("JSON validation is disabled");
        }
        return items;
      }, [
        outputFormat,
        template,
        validateJson,
        validation.errors,
        validation.valid,
        validationEnabled,
        variables,
      ]);

      const notes = useMemo(() => {
        const items: string[] = [];
        if (!validationEnabled) {
          items.push("Validation is disabled");
        }
        if (validationStrict) {
          items.push("Strict mode requires all variables");
        }
        if (outputFormat === "json" && !validateJson) {
          items.push("JSON output is not validated");
        }
        if (maxOutputLength) {
          items.push(`Max output length: ${maxOutputLength} chars`);
        }
        if (config.undefinedVariable === "placeholder") {
          items.push("Missing variables keep placeholders");
        }
        if (config.fallbackBehavior === "preserve") {
          items.push("Errors return the template output");
        }
        if (config.fallbackBehavior === "empty") {
          items.push("Errors return an empty output");
        }
        if (config.escapeHtml) {
          items.push("HTML escaping is enabled");
        }
        return items;
      }, [
        config.escapeHtml,
        config.fallbackBehavior,
        config.undefinedVariable,
        maxOutputLength,
        outputFormat,
        validateJson,
        validationEnabled,
        validationStrict,
      ]);

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-template"
            icon={<Icons.FileText size={20} />}
            subtitle={FORMAT_LABELS[outputFormat]}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <NodeField
                  label="Output"
                  value={FORMAT_LABELS[outputFormat] ?? outputFormat}
                />
                <NodeField
                  label="Variables"
                  value={variableCount > 0 ? `${variableCount}` : "None"}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Badge className="text-[10px]" variant="outline">
                  {SYNTAX_LABELS[syntax]}
                </Badge>
                {variableCount > 0 && (
                  <Badge className="text-[10px]" variant="secondary">
                    {variableCount} var{variableCount !== 1 ? "s" : ""}
                    {requiredCount > 0 && ` (${requiredCount} req)`}
                  </Badge>
                )}
              </div>

              {hasTemplate ? (
                <div className="rounded-sm border border-border/30 bg-muted/30 p-2">
                  <pre className="overflow-hidden font-mono text-[10px] text-muted-foreground">
                    {templatePreview}
                  </pre>
                </div>
              ) : (
                <div className="rounded-sm border border-border/50 border-dashed px-2 py-3 text-center text-muted-foreground text-xs">
                  No template
                </div>
              )}

              {variableCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {variables.slice(0, 3).map((v) => (
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 font-mono text-[10px]",
                        v.required
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                      key={v.id}
                    >
                      {syntax === "ejs" ? `<%= ${v.name} %>` : `{{${v.name}}}`}
                    </span>
                  ))}
                  {variableCount > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{variableCount - 3} more
                    </span>
                  )}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

TemplateNode.displayName = "TemplateNode";

export function createTemplateNodeData(): TemplateNodeData {
  return {
    label: "Template",
    config: {
      template: "",
      syntax: "handlebars",
      outputFormat: "text",
      variables: [],
      trimWhitespace: true,
      preserveNewlines: true,
      escapeHtml: false,
      undefinedVariable: "placeholder",
      fallbackBehavior: "preserve",
      validation: {
        enabled: true,
        strict: false,
        validateJson: false,
      },
    },
    inputs: [
      { id: "variables", label: "Variables", type: "data", required: true },
    ],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
