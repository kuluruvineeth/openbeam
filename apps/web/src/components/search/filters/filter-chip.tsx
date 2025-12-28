"use client";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

type FilterChipProps = {
  label: React.ReactNode;
  onRemove: () => void;
};

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge className="gap-1" variant="filter">
      {label}
      <button
        className="text-foreground/40 hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <Icons.Close size={10} />
      </button>
    </Badge>
  );
}
