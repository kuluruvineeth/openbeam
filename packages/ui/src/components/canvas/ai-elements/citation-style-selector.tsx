"use client";

import type { CitationStyle } from "@openbeam/types/canvas";
import { memo, type ReactNode } from "react";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

interface CitationOption {
  id: CitationStyle;
  name: string;
  description: string;
  icon: ReactNode;
}

const CITATION_OPTIONS: CitationOption[] = [
  {
    id: "inline",
    name: "Inline [n]",
    description: "Numbers in text",
    icon: <Icons.Hash size={16} />,
  },
  {
    id: "footnote",
    name: "Footnotes",
    description: "End of answer",
    icon: <Icons.FileText size={16} />,
  },
  {
    id: "none",
    name: "None",
    description: "No citations",
    icon: <Icons.Close size={16} />,
  },
];

interface CitationStyleSelectorProps {
  value: CitationStyle;
  onChange: (value: CitationStyle) => void;
}

export const CitationStyleSelector = memo(
  function CitationStyleSelectorComponent({
    value,
    onChange,
  }: CitationStyleSelectorProps) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {CITATION_OPTIONS.map((option) => (
          <SelectionCard
            description={option.description}
            icon={option.icon}
            key={option.id}
            label={option.name}
            onClick={() => onChange(option.id)}
            selected={value === option.id}
            size="sm"
          />
        ))}
      </div>
    );
  }
);

CitationStyleSelector.displayName = "CitationStyleSelector";

export type { CitationStyleSelectorProps };
