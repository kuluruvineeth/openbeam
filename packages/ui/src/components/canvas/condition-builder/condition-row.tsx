"use client";

import type {
  ConditionDataType,
  ConditionOperator,
  SingleCondition,
} from "@openplane/types/canvas";
import {
  DATA_TYPE_LABELS,
  OPERATOR_LABELS,
  OPERATOR_NEEDS_SECOND_VALUE,
  OPERATOR_NEEDS_VALUE,
  OPERATORS_BY_TYPE,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { CompactDatePicker } from "../../date-picker";
import { Icons } from "../../icons";
import { Input } from "../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Switch } from "../../switch";

interface ConditionRowProps {
  condition: SingleCondition;
  onChange: (condition: SingleCondition) => void;
  onDelete: () => void;
  fieldSuggestions?: string[];
  className?: string;
}

const EMPTY_SUGGESTIONS: string[] = [];

export const ConditionRow = memo(
  forwardRef<HTMLDivElement, ConditionRowProps>(function ConditionRowComponent(
    {
      condition,
      onChange,
      onDelete,
      fieldSuggestions = EMPTY_SUGGESTIONS,
      className,
    },
    ref
  ) {
    const availableOperators = useMemo(
      () => OPERATORS_BY_TYPE[condition.dataType],
      [condition.dataType]
    );

    const needsValue = OPERATOR_NEEDS_VALUE[condition.operator];
    const needsSecondValue = OPERATOR_NEEDS_SECOND_VALUE[condition.operator];

    const handleFieldChange = useCallback(
      (value: string) => {
        onChange({ ...condition, field: value });
      },
      [condition, onChange]
    );

    const handleDataTypeChange = useCallback(
      (value: ConditionDataType) => {
        const newOperators = OPERATORS_BY_TYPE[value];
        const currentOperatorValid = newOperators.includes(condition.operator);
        const defaultOperator = newOperators[0] ?? "equals";
        onChange({
          ...condition,
          dataType: value,
          operator: currentOperatorValid ? condition.operator : defaultOperator,
          value: undefined,
          secondValue: undefined,
        });
      },
      [condition, onChange]
    );

    const handleOperatorChange = useCallback(
      (value: ConditionOperator) => {
        const newNeedsValue = OPERATOR_NEEDS_VALUE[value];
        const newNeedsSecondValue = OPERATOR_NEEDS_SECOND_VALUE[value];
        onChange({
          ...condition,
          operator: value,
          value: newNeedsValue ? condition.value : undefined,
          secondValue: newNeedsSecondValue ? condition.secondValue : undefined,
        });
      },
      [condition, onChange]
    );

    const handleValueChange = useCallback(
      (value: string) => {
        const parsedValue = parseValueByType(value, condition.dataType);
        onChange({ ...condition, value: parsedValue });
      },
      [condition, onChange]
    );

    const handleSecondValueChange = useCallback(
      (value: string) => {
        const parsedValue = parseValueByType(value, condition.dataType);
        let normalizedValue: string | number | null;
        if (typeof parsedValue === "boolean") {
          normalizedValue = parsedValue ? 1 : 0;
        } else {
          normalizedValue = parsedValue;
        }
        onChange({ ...condition, secondValue: normalizedValue });
      },
      [condition, onChange]
    );

    return (
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-sm bg-secondary/30 p-2",
          className
        )}
        ref={ref}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            className="h-7 min-w-[100px] flex-1 border-0 bg-background/50 px-2 text-xs"
            list={`fields-${condition.id}`}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder="Field name"
            value={condition.field}
          />
          {fieldSuggestions.length > 0 && (
            <datalist id={`fields-${condition.id}`}>
              {fieldSuggestions.map((field) => (
                <option key={field} value={field} />
              ))}
            </datalist>
          )}

          <Select
            onValueChange={handleDataTypeChange}
            value={condition.dataType}
          >
            <SelectTrigger className="h-7 w-20 border-0 bg-background/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                <SelectItem className="text-xs" key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={handleOperatorChange}
            value={condition.operator}
          >
            <SelectTrigger className="h-7 w-28 border-0 bg-background/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map((op) => (
                <SelectItem className="text-xs" key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {needsValue && (
            <ValueInput
              dataType={condition.dataType}
              onChange={handleValueChange}
              value={condition.value}
            />
          )}

          {needsSecondValue && (
            <>
              <span className="text-muted-foreground text-xs">and</span>
              <ValueInput
                dataType={condition.dataType}
                onChange={handleSecondValueChange}
                value={condition.secondValue}
              />
            </>
          )}
        </div>

        <button
          aria-label="Delete condition"
          className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          onClick={onDelete}
          type="button"
        >
          <Icons.XIcon className="size-3.5" />
        </button>
      </div>
    );
  })
);

ConditionRow.displayName = "ConditionRow";

interface ValueInputProps {
  dataType: ConditionDataType;
  value: string | number | boolean | null | undefined;
  onChange: (value: string) => void;
}

function ValueInput({ dataType, value, onChange }: ValueInputProps) {
  if (dataType === "boolean") {
    const checked = value === true || value === "true";
    return (
      <div className="flex h-7 items-center rounded-sm bg-background/50 px-2">
        <Switch
          checked={checked}
          onCheckedChange={(val) => onChange(String(val))}
        />
        <span className="ml-2 text-muted-foreground text-xs">
          {checked ? "True" : "False"}
        </span>
      </div>
    );
  }

  if (dataType === "date") {
    const dateValue = value ? new Date(String(value)) : undefined;
    const isValidDate = dateValue && !Number.isNaN(dateValue.getTime());
    return (
      <CompactDatePicker
        className="border-0"
        onChange={(date) => onChange(date ? date.toISOString() : "")}
        placeholder="Date"
        value={isValidDate ? dateValue : undefined}
      />
    );
  }

  if (dataType === "number") {
    return (
      <Input
        className="h-7 w-24 border-0 bg-background/50 px-2 text-xs"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value"
        type="number"
        value={formatValue(value)}
      />
    );
  }

  return (
    <Input
      className="h-7 w-32 border-0 bg-background/50 px-2 text-xs"
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      type="text"
      value={formatValue(value)}
    />
  );
}

function parseValueByType(
  value: string,
  dataType: ConditionDataType
): string | number | boolean | null {
  if (value === "") {
    return null;
  }
  switch (dataType) {
    case "number": {
      const num = Number.parseFloat(value);
      return Number.isNaN(num) ? null : num;
    }
    case "boolean":
      return value.toLowerCase() === "true";
    default:
      return value;
  }
}

function formatValue(
  value: string | number | boolean | null | undefined
): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}
