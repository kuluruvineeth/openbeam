"use client";

import { Icons } from "@/components/icons";

type FilterChipProps = {
  label: React.ReactNode;
  onRemove: () => void;
};

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 bg-foreground/5 px-2 py-0.5 text-xs">
      {label}
      <button
        className="text-foreground/40 hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <Icons.Close size={10} />
      </button>
    </span>
  );
}
