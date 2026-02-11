"use client";

import { Button, Icons } from "@openplane/ui";

type MissionEmptyStateProps = {
  variant: "empty" | "no-results";
  onCreateClick?: () => void;
  onClearFilters?: () => void;
};

export function MissionEmptyState({
  variant,
  onCreateClick,
  onClearFilters,
}: MissionEmptyStateProps) {
  if (variant === "no-results") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <Icons.Search className="text-muted-foreground" size={48} />
        <h3 className="mt-4 font-medium text-lg">
          No missions match your filters
        </h3>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Try adjusting your filters or search query to find what you're looking
          for.
        </p>
        {onClearFilters && (
          <Button
            className="mt-4"
            onClick={onClearFilters}
            size="sm"
            variant="outline"
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <Icons.BotIcon className="text-muted-foreground" size={48} />
      <h3 className="mt-4 font-medium text-lg">No missions yet</h3>
      <p className="mt-1.5 text-muted-foreground text-sm">
        Create your first AI mission to orchestrate agents that work toward a
        shared objective.
      </p>
      <div className="mt-4 flex items-center gap-2">
        {onCreateClick && (
          <Button onClick={onCreateClick} size="sm">
            Create Mission
          </Button>
        )}
        <Button size="sm" variant="outline">
          Use Template
        </Button>
      </div>
    </div>
  );
}
