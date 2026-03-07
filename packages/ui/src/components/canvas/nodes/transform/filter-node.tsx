"use client";

import {
  type FilterLanguage,
  type FilterNodeConfig,
  type NodeStatus,
  OPERATOR_NEEDS_SECOND_VALUE,
  OPERATOR_NEEDS_VALUE,
  type Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface FilterNodeData {
  label: string;
  config: FilterNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type FilterNodeType = Node<FilterNodeData, "filter">;

const FILTER_LANGUAGE_LABELS: Record<FilterLanguage, string> = {
  javascript: "JavaScript",
  jmespath: "JMESPath",
  jsonata: "JSONata",
};
const RETURN_PATTERN = /\breturn\b/;

function getExpressionPreview(expression: string, maxLength = 70): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength)}...`
    : trimmed;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return false;
}

function collectConditionIssues(conditions: FilterNodeConfig["conditions"]) {
  let missingField = false;
  let missingValue = false;
  let missingSecondValue = false;

  for (const condition of conditions ?? []) {
    if (!condition.field.trim()) {
      missingField = true;
    }
    if (
      OPERATOR_NEEDS_VALUE[condition.operator] &&
      isEmptyValue(condition.value)
    ) {
      missingValue = true;
    }
    if (
      OPERATOR_NEEDS_SECOND_VALUE[condition.operator] &&
      isEmptyValue(condition.secondValue)
    ) {
      missingSecondValue = true;
    }
  }

  return { missingField, missingValue, missingSecondValue };
}

function buildWarnings(config: FilterNodeConfig): string[] {
  const warnings: string[] = [];
  const mode = config.mode ?? "visual";

  if (mode === "visual") {
    const issues = collectConditionIssues(config.conditions);
    if (issues.missingField) {
      warnings.push("Fill in condition fields");
    }
    if (issues.missingValue) {
      warnings.push("Provide values for all conditions");
    }
    if (issues.missingSecondValue) {
      warnings.push("Provide the second value for range conditions");
    }
    return warnings;
  }

  const expression = config.expression ?? "";
  if (!expression.trim()) {
    warnings.push("Filter expression is required");
  }
  if (
    (config.language ?? "javascript") === "javascript" &&
    RETURN_PATTERN.test(expression)
  ) {
    warnings.push("JavaScript expressions should not include return");
  }

  return warnings;
}

function buildNotes(config: FilterNodeConfig): string[] {
  const notes: string[] = [];
  const mode = config.mode ?? "visual";
  const logic = config.logic ?? "and";

  notes.push("Arrays are filtered per item; objects with items[] keep shape");

  if (mode === "visual") {
    if ((config.conditions?.length ?? 0) === 0) {
      notes.push("No conditions means everything passes through");
    } else if ((config.conditions?.length ?? 0) > 1) {
      notes.push(`Matches ${logic === "and" ? "all" : "any"} conditions`);
    }
    notes.push("Use dot notation for nested fields");
    return notes;
  }

  const language = config.language ?? "javascript";
  notes.push("Expression must resolve to a truthy value");
  if (language === "javascript") {
    notes.push(
      "Use data/item for current value, input for source payload, index for arrays"
    );
  }
  if (language === "jmespath") {
    notes.push("JMESPath runs against the current item");
  }
  if (language === "jsonata") {
    notes.push("JSONata bindings include input, item, index");
  }

  return notes;
}

function getFilterSubtitle(config: FilterNodeConfig): string {
  const mode = config.mode ?? "visual";
  if (mode === "visual") {
    return "Visual";
  }
  const language = config.language ?? "javascript";
  return FILTER_LANGUAGE_LABELS[language] ?? "Expression";
}

export const FilterNode = memo(
  forwardRef<HTMLDivElement, NodeProps<FilterNodeType>>(
    function FilterNodeComponent({ data, selected }, ref) {
      const subtitle = getFilterSubtitle(data.config);
      const mode = data.config.mode ?? "visual";
      const conditions = data.config.conditions ?? [];
      const logic = data.config.logic ?? "and";
      const language = data.config.language ?? "javascript";
      const expression = data.config.expression ?? "";
      const expressionPreview = useMemo(
        () => getExpressionPreview(expression),
        [expression]
      );
      const warnings = useMemo(() => buildWarnings(data.config), [data.config]);
      const notes = useMemo(() => buildNotes(data.config), [data.config]);

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
            colorVar="--node-filter"
            icon={<Icons.Filter size={20} />}
            subtitle={subtitle}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {mode === "visual" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <NodeField
                      label="Logic"
                      value={logic === "and" ? "ALL" : "ANY"}
                    />
                    <NodeField
                      label="Conditions"
                      value={
                        conditions.length > 0 ? `${conditions.length}` : "None"
                      }
                    />
                  </div>
                  {conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {conditions.slice(0, 3).map((condition) => (
                        <span
                          className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          key={condition.id}
                        >
                          {condition.field.trim() || "Unnamed"}
                        </span>
                      ))}
                      {conditions.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{conditions.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-sm border border-border/50 border-dashed p-2 text-center text-[10px] text-muted-foreground/70">
                      No conditions
                    </div>
                  )}
                </>
              ) : (
                <>
                  <NodeField
                    label="Language"
                    value={FILTER_LANGUAGE_LABELS[language] ?? language}
                  />
                  {expressionPreview ? (
                    <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                      {expressionPreview}
                    </div>
                  ) : (
                    <div className="rounded-sm border border-border/50 border-dashed p-2 text-center text-[10px] text-muted-foreground/70">
                      No expression
                    </div>
                  )}
                </>
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

FilterNode.displayName = "FilterNode";

export function createFilterNodeData(): FilterNodeData {
  return {
    label: "Filter",
    config: {
      mode: "visual",
      logic: "and",
      conditions: [],
      expression: "",
      language: "javascript",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
