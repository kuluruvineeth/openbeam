"use client";

import type {
  ConditionBuilderMode,
  ConditionLogic,
  FilterNodeConfig,
  SingleCondition,
} from "@openplane/types/canvas";
import { memo, useCallback } from "react";
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
        description="Expression must return a boolean value"
        label="Filter Expression"
      >
        <CodeEditor
          language="javascript"
          minHeight="120px"
          onChange={onExpressionChange}
          placeholder="return data.status === 'active';"
          value={expression}
        />
      </ConfigField>
    </div>
  );
});

ExpressionFilterBuilder.displayName = "ExpressionFilterBuilder";
