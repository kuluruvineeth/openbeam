"use client";

import { AlertCircle, Clock, Star, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { cn } from "../../utils/cn";

interface FilterSuggestion {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  filters: Record<string, unknown>;
}

interface SmartFilterSuggestionsProps {
  onApply: (filters: Record<string, unknown>) => void;
  suggestions?: FilterSuggestion[];
  className?: string;
}

function SmartFilterSuggestions({
  onApply,
  suggestions: customSuggestions,
  className,
}: SmartFilterSuggestionsProps) {
  const defaultSuggestions: FilterSuggestion[] = useMemo(
    () => [
      {
        id: "active-recent",
        label: "Active & Recent",
        description: "Active items updated in the last 7 days",
        icon: <Clock className="h-4 w-4" />,
        filters: {
          status: ["active"],
          dateRange: { preset: "last7d" },
          sortBy: "updatedAt",
        },
      },
      {
        id: "most-used",
        label: "Most Used",
        description: "Items with the highest usage count",
        icon: <TrendingUp className="h-4 w-4" />,
        filters: {
          sortBy: "usage",
          sortDir: "desc",
        },
      },
      {
        id: "favorites",
        label: "Favorites",
        description: "Your starred items",
        icon: <Star className="h-4 w-4" />,
        filters: {
          starred: true,
        },
      },
      {
        id: "needs-attention",
        label: "Needs Attention",
        description: "Items with errors or issues",
        icon: <AlertCircle className="h-4 w-4" />,
        filters: {
          status: ["error", "failed"],
          sortBy: "lastError",
        },
      },
    ],
    []
  );

  const suggestions = customSuggestions || defaultSuggestions;

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Quick Filters
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <button
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 text-left",
              "border border-border/50 hover:border-border",
              "transition-colors hover:bg-muted/50"
            )}
            key={suggestion.id}
            onClick={() => onApply(suggestion.filters)}
            type="button"
          >
            <div className="rounded-md bg-muted p-1.5">{suggestion.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{suggestion.label}</p>
              <p className="truncate text-muted-foreground text-xs">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { SmartFilterSuggestions };
export type { FilterSuggestion, SmartFilterSuggestionsProps };
