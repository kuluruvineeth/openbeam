"use client";

import type { CodeRuntime } from "@openplane/types/canvas";
import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";
import { ScrollArea } from "../../scroll-area";
import {
  CODE_TEMPLATES,
  type CodeTemplateWithIcon,
  TEMPLATE_CATEGORIES,
} from "./code-templates";

export interface CodeTemplateSelectorProps {
  runtime: CodeRuntime;
  onSelect: (template: CodeTemplateWithIcon) => void;
  disabled?: boolean;
  className?: string;
}

export const CodeTemplateSelector = memo(
  function CodeTemplateSelectorComponent({
    runtime,
    onSelect,
    disabled,
    className,
  }: CodeTemplateSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const allForRuntime = useMemo(
      () => CODE_TEMPLATES.filter((t) => t.runtime === runtime),
      [runtime]
    );

    const templates = useMemo(() => {
      if (selectedCategory === "all") {
        return allForRuntime;
      }
      return allForRuntime.filter((t) => t.category === selectedCategory);
    }, [allForRuntime, selectedCategory]);

    const visibleCategories = useMemo(
      () =>
        TEMPLATE_CATEGORIES.filter((cat) =>
          allForRuntime.some((t) => t.category === cat.id)
        ),
      [allForRuntime]
    );

    const handleSelect = useCallback(
      (template: CodeTemplateWithIcon) => {
        onSelect(template);
        setOpen(false);
      },
      [onSelect]
    );

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className={cn("gap-1.5", className)}
            disabled={disabled}
            size="sm"
            variant="outline"
          >
            <Icons.FileCode className="size-3.5" />
            Templates
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[300px] p-0"
          collisionPadding={8}
          onWheel={(e: React.WheelEvent) => e.stopPropagation()}
          side="bottom"
        >
          <div className="border-border/50 border-b px-3 py-2">
            <p className="font-medium text-sm">Code Templates</p>
            <p className="text-muted-foreground text-xs">
              {allForRuntime.length} for{" "}
              {runtime.charAt(0).toUpperCase() + runtime.slice(1)}
            </p>
          </div>

          <div className="no-scrollbar flex gap-1 overflow-x-auto border-border/50 border-b px-2 py-1.5">
            <button
              className={cn(
                "shrink-0 rounded-sm px-2 py-0.5 text-xs transition-colors",
                selectedCategory === "all"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSelectedCategory("all")}
              type="button"
            >
              All
            </button>
            {visibleCategories.map((cat) => (
              <button
                className={cn(
                  "shrink-0 rounded-sm px-2 py-0.5 text-xs transition-colors",
                  selectedCategory === cat.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>

          <ScrollArea className="h-[280px]">
            <div className="space-y-0.5 p-1.5">
              {templates.length === 0 ? (
                <div className="py-8 text-center">
                  <Icons.FileCode className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground text-sm">
                    No templates
                  </p>
                </div>
              ) : (
                templates.map((template) => {
                  const Icon = Icons[template.icon];
                  return (
                    <button
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left",
                        "transition-colors hover:bg-muted/50"
                      )}
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      type="button"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {template.name}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }
);

CodeTemplateSelector.displayName = "CodeTemplateSelector";
