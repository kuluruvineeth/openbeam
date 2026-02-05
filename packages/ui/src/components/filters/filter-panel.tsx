"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "date" | "range" | "custom";
  options?: FilterOption[];
  component?: ReactNode;
}

interface FilterPanelProps {
  sections: FilterSection[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onReset: () => void;
  className?: string;
}

function FilterPanel({
  sections,
  values,
  onChange,
  onReset,
  className,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.slice(0, 2).map((s) => s.id))
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCheckboxChange = (
    sectionId: string,
    value: string,
    checked: boolean
  ) => {
    const current = (values[sectionId] as string[]) || [];
    const updated = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    onChange({
      ...values,
      [sectionId]: updated.length > 0 ? updated : undefined,
    });
  };

  const activeFilterCount = Object.values(values).filter(
    (v) =>
      v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div
      className={cn("w-64 border-border border-r bg-background/50", className)}
    >
      <div className="flex items-center justify-between border-border border-b p-4">
        <div className="flex items-center gap-2">
          <Icons.Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground text-xs">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button onClick={onReset} size="sm" variant="ghost">
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-1 p-2">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            onOpenChange={() => toggleSection(section.id)}
            open={expandedSections.has(section.id)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 font-medium text-sm hover:bg-muted">
              {section.title}
              {expandedSections.has(section.id) ? (
                <Icons.ChevronDown className="h-4 w-4" />
              ) : (
                <Icons.ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 px-2 py-2">
                {section.type === "checkbox" &&
                  section.options?.map((option) => {
                    const checkboxId = `${section.id}-${option.value}`;
                    return (
                      <div
                        className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted"
                        key={option.value}
                      >
                        <Checkbox
                          checked={
                            (
                              values[section.id] as string[] | undefined
                            )?.includes(option.value) ?? false
                          }
                          id={checkboxId}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              section.id,
                              option.value,
                              !!checked
                            )
                          }
                        />
                        <label
                          className="flex flex-1 cursor-pointer items-center gap-2"
                          htmlFor={checkboxId}
                        >
                          <span className="flex-1 text-sm">{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {option.count}
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                {section.type === "custom" && section.component}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

export { FilterPanel };
export type { FilterOption, FilterPanelProps, FilterSection };
