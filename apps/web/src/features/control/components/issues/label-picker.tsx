"use client";

import {
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  useAssignLabel,
  useIssueLabels,
  useRemoveLabel,
} from "../../hooks/use-control-issues";

type LabelPickerProps = {
  issueId: string;
  assignedLabelIds: string[];
  className?: string;
};

export function LabelPicker({
  issueId,
  assignedLabelIds,
  className,
}: LabelPickerProps) {
  const { data: labels } = useIssueLabels();
  const assignLabel = useAssignLabel();
  const removeLabel = useRemoveLabel();

  const handleToggle = (labelId: string, assigned: boolean) => {
    if (assigned) {
      removeLabel.mutate({ issueId, labelId });
    } else {
      assignLabel.mutate({ issueId, labelId });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground",
            className
          )}
          type="button"
        >
          <Icons.Tags size={12} />
          Labels
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {(labels ?? []).length === 0 && (
          <p className="px-2 py-3 text-center text-muted-foreground text-xs">
            No labels available
          </p>
        )}
        {(labels ?? []).map(
          (label: { id: string; name: string; color: string }) => {
            const assigned = assignedLabelIds.includes(label.id);
            return (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                key={label.id}
                onClick={() => handleToggle(label.id, assigned)}
                type="button"
              >
                <Checkbox checked={assigned} />
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="truncate">{label.name}</span>
              </button>
            );
          }
        )}
      </PopoverContent>
    </Popover>
  );
}
