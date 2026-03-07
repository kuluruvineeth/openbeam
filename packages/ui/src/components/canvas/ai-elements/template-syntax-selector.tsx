"use client";

import type { TemplateSyntax } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

const TEMPLATE_SYNTAXES = [
  {
    id: "handlebars" as const,
    name: "Handlebars",
    description: "Full-featured with helpers",
    icon: Icons.Braces,
  },
  {
    id: "mustache" as const,
    name: "Mustache",
    description: "Logic-less simplicity",
    icon: Icons.Code,
  },
  {
    id: "ejs" as const,
    name: "EJS",
    description: "JavaScript expressions",
    icon: Icons.Code,
  },
];

export interface TemplateSyntaxSelectorProps {
  value: TemplateSyntax;
  onChange: (value: TemplateSyntax) => void;
  disabled?: boolean;
  className?: string;
}

export const TemplateSyntaxSelector = memo(
  function TemplateSyntaxSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: TemplateSyntaxSelectorProps) {
    const handleSelect = useCallback(
      (syntaxId: TemplateSyntax) => {
        onChange(syntaxId);
      },
      [onChange]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-3 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {TEMPLATE_SYNTAXES.map((syntax) => {
          const Icon = syntax.icon;
          const isSelected = value === syntax.id;

          return (
            <SelectionCard
              description={syntax.description}
              disabled={disabled}
              icon={
                <Icon
                  className={cn(
                    "size-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              }
              key={syntax.id}
              label={syntax.name}
              layout="vertical"
              onClick={() => handleSelect(syntax.id)}
              selected={isSelected}
              size="sm"
            />
          );
        })}
      </div>
    );
  }
);

TemplateSyntaxSelector.displayName = "TemplateSyntaxSelector";
