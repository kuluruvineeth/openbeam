"use client";

import type {
  ConditionBranch,
  ConditionGroup as ConditionGroupType,
} from "@openplane/types/canvas";
import { BRANCH_COLORS } from "@openplane/types/canvas";
import { GripVertical } from "lucide-react";
import { forwardRef, memo, useCallback, useState } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { ConditionGroup } from "./condition-group";

interface BranchCardProps {
  branch: ConditionBranch;
  index: number;
  onChange: (branch: ConditionBranch) => void;
  onDelete: () => void;
  fieldSuggestions?: string[];
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  className?: string;
}

export const BranchCard = memo(
  forwardRef<HTMLDivElement, BranchCardProps>(function BranchCardComponent(
    {
      branch,
      index,
      onChange,
      onDelete,
      fieldSuggestions,
      isDragging,
      dragHandleProps,
      className,
    },
    ref
  ) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditingLabel, setIsEditingLabel] = useState(false);

    const groups = branch.groups ?? [];
    const branchColor =
      branch.color ?? BRANCH_COLORS[index % BRANCH_COLORS.length];

    const handleLabelChange = useCallback(
      (label: string) => {
        onChange({ ...branch, label });
      },
      [branch, onChange]
    );

    const handleAddGroup = useCallback(() => {
      const newGroup: ConditionGroupType = {
        id: crypto.randomUUID(),
        logic: "and",
        conditions: [],
      };
      onChange({ ...branch, groups: [...groups, newGroup] });
    }, [branch, groups, onChange]);

    const handleGroupChange = useCallback(
      (groupIndex: number, group: ConditionGroupType) => {
        const newGroups = [...groups];
        newGroups[groupIndex] = group;
        onChange({ ...branch, groups: newGroups });
      },
      [branch, groups, onChange]
    );

    const handleGroupDelete = useCallback(
      (groupIndex: number) => {
        const newGroups = groups.filter((_, i) => i !== groupIndex);
        onChange({ ...branch, groups: newGroups });
      },
      [branch, groups, onChange]
    );

    const conditionCount = groups.reduce(
      (sum, g) => sum + (g.conditions?.length ?? 0),
      0
    );

    return (
      <div
        className={cn(
          "group/branch relative rounded-md border border-border/50 bg-card/40 transition-all",
          isDragging && "shadow-lg ring-2 ring-primary/50",
          className
        )}
        ref={ref}
      >
        <div
          className="flex items-center gap-2 border-border/30 border-b px-3 py-2"
          style={{ borderLeftColor: branchColor, borderLeftWidth: 3 }}
        >
          <div
            className="cursor-grab text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </div>

          <div
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: branchColor }}
          />

          {isEditingLabel ? (
            <Input
              autoFocus
              className="h-6 flex-1 border-0 bg-transparent px-1 font-medium text-sm"
              onBlur={() => setIsEditingLabel(false)}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setIsEditingLabel(false);
                }
              }}
              value={branch.label}
            />
          ) : (
            <button
              className="flex-1 truncate text-left font-medium text-sm hover:text-primary"
              onClick={() => setIsEditingLabel(true)}
              type="button"
            >
              {branch.label || `Branch ${index + 1}`}
            </button>
          )}

          <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-muted-foreground text-xs">
            {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
          </span>

          <button
            className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-secondary"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            <Icons.ChevronDown
              className={cn(
                "size-4 transition-transform",
                !isExpanded && "-rotate-90"
              )}
            />
          </button>

          <button
            aria-label="Delete branch"
            className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/branch:opacity-100"
            onClick={onDelete}
            type="button"
          >
            <Icons.Trash className="size-3.5" />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3 p-3">
            {groups.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground text-sm">
                  No condition groups defined
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Add a group to define when this branch should execute
                </p>
              </div>
            ) : (
              groups.map((group, groupIndex) => (
                <div className="relative" key={group.id}>
                  {groupIndex > 0 && (
                    <div className="-top-1.5 -translate-x-1/2 absolute left-1/2">
                      <span className="rounded-sm bg-purple-500/15 px-2 py-0.5 font-medium text-[10px] text-purple-600 uppercase dark:text-purple-400">
                        or
                      </span>
                    </div>
                  )}
                  <ConditionGroup
                    className={groupIndex > 0 ? "mt-4" : undefined}
                    fieldSuggestions={fieldSuggestions}
                    group={group}
                    onChange={(g) => handleGroupChange(groupIndex, g)}
                    onDelete={() => handleGroupDelete(groupIndex)}
                    showDeleteButton={groups.length > 1}
                  />
                </div>
              ))
            )}

            <Button
              className="mt-2 h-8 w-full text-xs"
              onClick={handleAddGroup}
              size="sm"
              variant="outline"
            >
              <Icons.Plus className="mr-1 size-3.5" />
              Add condition group
            </Button>
          </div>
        )}
      </div>
    );
  })
);

BranchCard.displayName = "BranchCard";
