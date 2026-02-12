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
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted/50">
        <Icons.BotIcon className="text-muted-foreground" size={32} />
      </div>
      <h3 className="mt-5 font-medium text-lg">No missions yet</h3>
      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
        Missions orchestrate teams of AI agents toward a shared objective.
        Create one to get started.
      </p>
      {onCreateClick && (
        <Button className="mt-5" onClick={onCreateClick} size="sm">
          <Icons.Plus size={14} />
          Create Mission
        </Button>
      )}
    </div>
  );
}
