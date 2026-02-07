"use client";

import { Badge, Button, Icons } from "@openplane/ui";

type Filter = {
  id: string;
  label: string;
};

type FilterListProps = {
  filters: Filter[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function FilterList({ filters, onRemove, onClear }: FilterListProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <Badge className="gap-1 pr-1 pl-2" key={filter.id} variant="secondary">
          {filter.label}
          <button
            className="rounded-full p-0.5 hover:bg-muted"
            onClick={() => onRemove(filter.id)}
            type="button"
          >
            <Icons.XIcon size={12} />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <Button
          className="h-6 text-muted-foreground text-xs"
          onClick={onClear}
          size="sm"
          variant="ghost"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
