"use client";

import type { TemplateOutputFormat } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

const OUTPUT_FORMATS = [
  {
    id: "text" as const,
    name: "Text",
    description: "Plain text output",
    icon: Icons.AlignLeft,
  },
  {
    id: "json" as const,
    name: "JSON",
    description: "Structured data",
    icon: Icons.Braces,
  },
  {
    id: "markdown" as const,
    name: "Markdown",
    description: "Rich formatting",
    icon: Icons.FileText,
  },
  {
    id: "html" as const,
    name: "HTML",
    description: "Web content",
    icon: Icons.Code,
  },
  {
    id: "xml" as const,
    name: "XML",
    description: "Structured markup",
    icon: Icons.FileCode,
  },
];

export interface TemplateOutputFormatSelectorProps {
  value: TemplateOutputFormat;
  onChange: (value: TemplateOutputFormat) => void;
  disabled?: boolean;
  className?: string;
}

export const TemplateOutputFormatSelector = memo(
  function TemplateOutputFormatSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: TemplateOutputFormatSelectorProps) {
    const handleSelect = useCallback(
      (formatId: TemplateOutputFormat) => {
        onChange(formatId);
      },
      [onChange]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {OUTPUT_FORMATS.map((format) => {
          const Icon = format.icon;
          const isSelected = value === format.id;

          return (
            <SelectionCard
              description={format.description}
              disabled={disabled}
              icon={
                <Icon
                  className={cn(
                    "size-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              }
              key={format.id}
              label={format.name}
              onClick={() => handleSelect(format.id)}
              selected={isSelected}
              size="sm"
            />
          );
        })}
      </div>
    );
  }
);

TemplateOutputFormatSelector.displayName = "TemplateOutputFormatSelector";
