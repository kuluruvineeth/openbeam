"use client";

import type {
  ConditionGroup as ConditionGroupType,
  ConditionLogic,
  SingleCondition,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { ConditionRow } from "./condition-row";

interface ConditionGroupProps {
  group: ConditionGroupType;
  onChange: (group: ConditionGroupType) => void;
  onDelete: () => void;
  fieldSuggestions?: string[];
  showDeleteButton?: boolean;
  className?: string;
}

export const ConditionGroup = memo(
  forwardRef<HTMLDivElement, ConditionGroupProps>(
    function ConditionGroupComponent(
      {
        group,
        onChange,
        onDelete,
        fieldSuggestions,
        showDeleteButton = true,
        className,
      },
      ref
    ) {
      const handleLogicToggle = useCallback(() => {
        const newLogic: ConditionLogic = group.logic === "and" ? "or" : "and";
        onChange({ ...group, logic: newLogic });
      }, [group, onChange]);

      const handleAddCondition = useCallback(() => {
        const newCondition: SingleCondition = {
          id: crypto.randomUUID(),
          field: "",
          dataType: "string",
          operator: "equals",
          value: undefined,
        };
        onChange({ ...group, conditions: [...group.conditions, newCondition] });
      }, [group, onChange]);

      const handleConditionChange = useCallback(
        (index: number, condition: SingleCondition) => {
          const newConditions = [...group.conditions];
          newConditions[index] = condition;
          onChange({ ...group, conditions: newConditions });
        },
        [group, onChange]
      );

      const handleConditionDelete = useCallback(
        (index: number) => {
          const newConditions = group.conditions.filter((_, i) => i !== index);
          onChange({ ...group, conditions: newConditions });
        },
        [group, onChange]
      );

      return (
        <div
          className={cn(
            "relative rounded-md border border-border/50 bg-card/30",
            className
          )}
          ref={ref}
        >
          <div className="flex items-center justify-between border-border/30 border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "flex h-6 items-center gap-1 rounded-sm px-2 font-medium text-xs transition-colors",
                  group.logic === "and"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                )}
                onClick={handleLogicToggle}
                type="button"
              >
                {group.logic === "and" ? (
                  <>
                    <Icons.CircleDot className="size-3" />
                    ALL
                  </>
                ) : (
                  <>
                    <Icons.Circle className="size-3" />
                    ANY
                  </>
                )}
              </button>
              <span className="text-muted-foreground text-xs">
                of these conditions must match
              </span>
            </div>

            {showDeleteButton && (
              <button
                aria-label="Delete condition group"
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
                type="button"
              >
                <Icons.Trash className="size-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2 p-3">
            {group.conditions.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-xs">
                No conditions yet. Add one to define the logic.
              </div>
            ) : (
              group.conditions.map((condition, index) => (
                <div className="relative" key={condition.id}>
                  {index > 0 && (
                    <div className="-top-1 absolute left-4 flex items-center gap-1 text-muted-foreground text-xs">
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 font-medium text-[10px] uppercase",
                          group.logic === "and"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        )}
                      >
                        {group.logic}
                      </span>
                    </div>
                  )}
                  <ConditionRow
                    className={index > 0 ? "mt-3" : undefined}
                    condition={condition}
                    fieldSuggestions={fieldSuggestions}
                    onChange={(c) => handleConditionChange(index, c)}
                    onDelete={() => handleConditionDelete(index)}
                  />
                </div>
              ))
            )}

            <Button
              className="mt-2 h-7 w-full text-xs"
              onClick={handleAddCondition}
              size="sm"
              variant="ghost"
            >
              <Icons.Plus className="mr-1 size-3" />
              Add condition
            </Button>
          </div>
        </div>
      );
    }
  )
);

ConditionGroup.displayName = "ConditionGroup";
