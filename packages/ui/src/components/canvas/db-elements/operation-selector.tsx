"use client";

import type { DatabaseOperation } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";

const OPERATION_LABELS: Record<DatabaseOperation, string> = {
  execute_query: "Query",
  select: "Select",
  insert: "Insert",
  update: "Update",
  upsert: "Upsert",
  delete: "Delete",
};

const OPERATIONS: DatabaseOperation[] = [
  "execute_query",
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
];

interface OperationSelectorProps {
  value: DatabaseOperation;
  onChange: (operation: DatabaseOperation) => void;
  disabled?: boolean;
}

export const OperationSelector = memo(
  forwardRef<HTMLDivElement, OperationSelectorProps>(
    function OperationSelectorComponent({ value, onChange, disabled }, ref) {
      const handleChange = useCallback(
        (val: string) => {
          if (val) {
            onChange(val as DatabaseOperation);
          }
        },
        [onChange]
      );

      return (
        <ToggleGroup
          disabled={disabled}
          onValueChange={handleChange}
          ref={ref}
          type="single"
          value={value}
          variant="outline"
        >
          {OPERATIONS.map((op) => (
            <ToggleGroupItem className="h-7 px-2 text-xs" key={op} value={op}>
              {OPERATION_LABELS[op]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }
  )
);

OperationSelector.displayName = "OperationSelector";
