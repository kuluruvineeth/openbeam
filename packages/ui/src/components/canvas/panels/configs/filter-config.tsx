"use client";

import {
  type ConditionBuilderMode,
  type ConditionLogic,
  type FilterLanguage,
  type FilterNodeConfig,
  OPERATOR_NEEDS_SECOND_VALUE,
  OPERATOR_NEEDS_VALUE,
  type SingleCondition,
} from "@openbeam/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../../utils";
import { CodeEditor } from "../../../code-editor";
import { Icons } from "../../../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { ConditionRow } from "../../condition-builder/condition-row";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface FilterConfigPanelProps {
  config: FilterNodeConfig;
  onChange: (config: Partial<FilterNodeConfig>) => void;
  fieldSuggestions?: string[];
}

const FILTER_LANGUAGE_LABELS = {
  javascript: "JavaScript",
  jmespath: "JMESPath",
  jsonata: "JSONata",
} as const;
const FILTER_PLACEHOLDERS: Record<FilterLanguage, string> = {
  javascript: "data.status === 'active'",
  jmespath: "status == 'active'",
  jsonata: "status = 'active'",
};
const FILTER_EDITOR_LANGUAGES: Record<FilterLanguage, "javascript" | "json"> = {
  javascript: "javascript",
  jmespath: "json",
  jsonata: "javascript",
};
const RETURN_PATTERN = /\breturn\b/;

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return false;
}

function collectConditionIssues(conditions: SingleCondition[]) {
  let missingField = false;
  let missingValue = false;
  let missingSecondValue = false;

  for (const condition of conditions) {
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
    const conditions = config.conditions ?? [];
    const issues = collectConditionIssues(conditions);
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
  const conditions = config.conditions ?? [];
  const logic = config.logic ?? "and";

  notes.push("Arrays are filtered per item; objects with items[] keep shape");

  if (mode === "visual") {
    if (conditions.length === 0) {
      notes.push("No conditions means everything passes through");
    } else if (conditions.length > 1) {
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

export const FilterConfigPanel = memo(function FilterConfigPanelComponent({
  config,
  onChange,
  fieldSuggestions,
}: FilterConfigPanelProps) {
  const mode = config.mode ?? "visual";
  const logic = config.logic ?? "and";
  const conditions = config.conditions ?? [];
  const expression = config.expression ?? "";
  const language = config.language ?? "javascript";
  const warnings = useMemo(() => buildWarnings(config), [config]);
  const notes = useMemo(() => buildNotes(config), [config]);

  const handleModeChange = useCallback(
    (newMode: ConditionBuilderMode) => {
      onChange({ mode: newMode });
    },
    [onChange]
  );

  const handleLogicChange = useCallback(
    (newLogic: ConditionLogic) => {
      onChange({ logic: newLogic });
    },
    [onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, updated: SingleCondition) => {
      const next = [...conditions];
      next[index] = updated;
      onChange({ conditions: next });
    },
    [conditions, onChange]
  );

  const handleConditionDelete = useCallback(
    (index: number) => {
      onChange({ conditions: conditions.filter((_, i) => i !== index) });
    },
    [conditions, onChange]
  );

  const handleAddCondition = useCallback(() => {
    const newCondition: SingleCondition = {
      id: crypto.randomUUID(),
      field: "",
      dataType: "string",
      operator: "equals",
      value: "",
    };
    onChange({ conditions: [...conditions, newCondition] });
  }, [conditions, onChange]);

  return (
    <div className="divide-y divide-border/50">
      <ConfigSection
        defaultOpen
        icon={<Icons.Filter className="size-4" />}
        title="Filter Logic"
      >
        <div className="space-y-4">
          <ModeToggle mode={mode} onModeChange={handleModeChange} />

          {mode === "visual" ? (
            <VisualFilterBuilder
              conditions={conditions}
              fieldSuggestions={fieldSuggestions}
              logic={logic}
              onAddCondition={handleAddCondition}
              onConditionChange={handleConditionChange}
              onConditionDelete={handleConditionDelete}
              onLogicChange={handleLogicChange}
            />
          ) : (
            <ExpressionFilterBuilder
              expression={expression}
              language={language}
              onExpressionChange={(val) => onChange({ expression: val })}
              onLanguageChange={(val) => onChange({ language: val })}
            />
          )}
        </div>
      </ConfigSection>
      <WarningsList items={warnings} />
      <NotesList items={notes} />
    </div>
  );
});

FilterConfigPanel.displayName = "FilterConfigPanel";

interface ModeToggleProps {
  mode: ConditionBuilderMode;
  onModeChange: (mode: ConditionBuilderMode) => void;
}

const ModeToggle = memo(function ModeToggleComponent({
  mode,
  onModeChange,
}: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md bg-secondary/50 p-0.5">
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium text-xs transition-colors",
          mode === "visual"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onModeChange("visual")}
        type="button"
      >
        <Icons.Layers className="size-3.5" />
        Visual
      </button>
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium text-xs transition-colors",
          mode === "expression"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onModeChange("expression")}
        type="button"
      >
        <Icons.Code className="size-3.5" />
        Expression
      </button>
    </div>
  );
});

ModeToggle.displayName = "ModeToggle";

interface VisualFilterBuilderProps {
  logic: ConditionLogic;
  conditions: SingleCondition[];
  onLogicChange: (logic: ConditionLogic) => void;
  onConditionChange: (index: number, condition: SingleCondition) => void;
  onConditionDelete: (index: number) => void;
  onAddCondition: () => void;
  fieldSuggestions?: string[];
}

const VisualFilterBuilder = memo(function VisualFilterBuilderComponent({
  logic,
  conditions,
  onLogicChange,
  onConditionChange,
  onConditionDelete,
  onAddCondition,
  fieldSuggestions,
}: VisualFilterBuilderProps) {
  return (
    <div className="space-y-3">
      <LogicToggle logic={logic} onLogicChange={onLogicChange} />

      {conditions.length > 0 ? (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              condition={condition}
              fieldSuggestions={fieldSuggestions}
              key={condition.id}
              onChange={(updated) => onConditionChange(index, updated)}
              onDelete={() => onConditionDelete(index)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border/50 border-dashed py-6 text-center text-muted-foreground text-xs">
          No conditions defined
        </div>
      )}

      <button
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border/50 border-dashed py-2 text-muted-foreground text-xs transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
        onClick={onAddCondition}
        type="button"
      >
        <Icons.Plus className="size-3.5" />
        Add condition
      </button>
    </div>
  );
});

VisualFilterBuilder.displayName = "VisualFilterBuilder";

interface LogicToggleProps {
  logic: ConditionLogic;
  onLogicChange: (logic: ConditionLogic) => void;
}

const LogicToggle = memo(function LogicToggleComponent({
  logic,
  onLogicChange,
}: LogicToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">Match</span>
      <div className="inline-flex rounded-md bg-secondary/50 p-0.5">
        <button
          className={cn(
            "rounded-sm px-2 py-0.5 font-medium text-xs transition-colors",
            logic === "and"
              ? "bg-blue-500/15 text-blue-500 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onLogicChange("and")}
          type="button"
        >
          ALL
        </button>
        <button
          className={cn(
            "rounded-sm px-2 py-0.5 font-medium text-xs transition-colors",
            logic === "or"
              ? "bg-orange-500/15 text-orange-500 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onLogicChange("or")}
          type="button"
        >
          ANY
        </button>
      </div>
      <span className="text-muted-foreground text-xs">conditions</span>
    </div>
  );
});

LogicToggle.displayName = "LogicToggle";

interface ExpressionFilterBuilderProps {
  expression: string;
  language: FilterNodeConfig["language"];
  onExpressionChange: (value: string) => void;
  onLanguageChange: (value: FilterNodeConfig["language"]) => void;
}

const ExpressionFilterBuilder = memo(function ExpressionFilterBuilderComponent({
  expression,
  language,
  onExpressionChange,
  onLanguageChange,
}: ExpressionFilterBuilderProps) {
  const editorLanguage = FILTER_EDITOR_LANGUAGES[language];
  const placeholder = FILTER_PLACEHOLDERS[language];

  return (
    <div className="space-y-4">
      <ConfigField label="Language">
        <Select onValueChange={onLanguageChange} value={language}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FILTER_LANGUAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfigField>

      <ConfigField
        description="Expression must resolve to a truthy or falsey value"
        label="Filter Expression"
      >
        <CodeEditor
          language={editorLanguage}
          minHeight="120px"
          onChange={onExpressionChange}
          placeholder={placeholder}
          value={expression}
        />
      </ConfigField>
    </div>
  );
});

ExpressionFilterBuilder.displayName = "ExpressionFilterBuilder";
