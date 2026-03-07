"use client";

import type { GraphqlOperationType } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";

const OPERATION_LABELS: Record<GraphqlOperationType, string> = {
  query: "Query",
  mutation: "Mutation",
  subscription: "Subscription",
};

interface OperationTypeSelectorProps {
  value: GraphqlOperationType;
  onChange: (value: GraphqlOperationType) => void;
  disabled?: boolean;
  methodIsGet?: boolean;
}

export const OperationTypeSelector = memo(
  forwardRef<HTMLDivElement, OperationTypeSelectorProps>(
    function OperationTypeSelectorComponent(
      { value, onChange, disabled, methodIsGet },
      ref
    ) {
      const handleChange = useCallback(
        (v: string) => {
          if (v) {
            onChange(v as GraphqlOperationType);
          }
        },
        [onChange]
      );

      return (
        <ToggleGroup
          className="w-full justify-start"
          disabled={disabled}
          onValueChange={handleChange}
          ref={ref}
          size="sm"
          type="single"
          value={value}
        >
          {(Object.keys(OPERATION_LABELS) as GraphqlOperationType[]).map(
            (op) => (
              <ToggleGroupItem
                className="flex-1 text-xs"
                disabled={methodIsGet && op !== "query"}
                key={op}
                value={op}
              >
                {OPERATION_LABELS[op]}
              </ToggleGroupItem>
            )
          )}
        </ToggleGroup>
      );
    }
  )
);

OperationTypeSelector.displayName = "OperationTypeSelector";
