"use client";

import { memo, type ReactNode } from "react";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

type SearchType = "hybrid" | "semantic" | "keyword";

interface SearchStrategy {
  id: SearchType;
  name: string;
  description: string;
  icon: ReactNode;
}

const SEARCH_STRATEGIES: SearchStrategy[] = [
  {
    id: "hybrid",
    name: "Hybrid",
    description: "Best for most cases",
    icon: <Icons.Layers size={16} />,
  },
  {
    id: "semantic",
    name: "Semantic",
    description: "Pure similarity",
    icon: <Icons.BrainCircuit size={16} />,
  },
  {
    id: "keyword",
    name: "Keyword",
    description: "Exact match",
    icon: <Icons.Text size={16} />,
  },
];

interface SearchStrategySelectorProps {
  value: SearchType;
  onChange: (value: SearchType) => void;
}

export const SearchStrategySelector = memo(
  function SearchStrategySelectorComponent({
    value,
    onChange,
  }: SearchStrategySelectorProps) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {SEARCH_STRATEGIES.map((strategy) => (
          <SelectionCard
            description={strategy.description}
            icon={strategy.icon}
            key={strategy.id}
            label={strategy.name}
            onClick={() => onChange(strategy.id)}
            selected={value === strategy.id}
            size="sm"
          />
        ))}
      </div>
    );
  }
);

SearchStrategySelector.displayName = "SearchStrategySelector";

export type { SearchType, SearchStrategySelectorProps };
