"use client";

import { Icons } from "@/components/icons";

type SearchEmptyStateProps = {
  query: string;
};

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <div className="relative flex min-h-[400px] flex-col items-center justify-center py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
          <Icons.Search size={100} />
        </div>
        <div className="-translate-y-1/2 absolute top-1/2 right-1/4">
          <Icons.FileIcon size={80} />
        </div>
        <div className="absolute bottom-1/4 left-1/3">
          <Icons.Messages size={60} />
        </div>
      </div>

      <div className="relative z-10 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-border/50 bg-background">
          <Icons.Search className="text-foreground/30" size={20} />
        </div>

        <h3 className="font-medium text-foreground/80 text-sm">
          No results found
        </h3>

        <p className="mt-2 max-w-xs text-foreground/40 text-xs">
          No documents match &ldquo;{query}&rdquo;. Try a different search term
          or check your filters.
        </p>
      </div>
    </div>
  );
}
