"use client";

import { Input } from "@openbeam/ui";
import { Icons } from "@/components/icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
  placeholder?: string;
};

export function SearchInputBar({
  value,
  onChange,
  isSearching,
  placeholder = "Search everything...",
}: Props) {
  return (
    <div className="flex h-12 items-center gap-3 border border-border/50 bg-background px-4">
      <Icons.Search className="shrink-0 text-foreground/40" size={18} />
      <Input
        autoFocus
        className="h-full flex-1 border-0 bg-transparent px-0 text-[15px] placeholder:text-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        type="text"
        value={value}
      />
      {isSearching && (
        <Icons.Spinner
          className="shrink-0 animate-spin text-foreground/30"
          size={14}
        />
      )}
      {value && (
        <button
          className="shrink-0 text-foreground/40 transition-colors hover:text-foreground/70"
          onClick={() => onChange("")}
          type="button"
        >
          <Icons.Close size={16} />
        </button>
      )}
    </div>
  );
}
