"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEARCH_SUGGESTIONS = [
  { label: "Recent documents", query: "recent:" },
  { label: "From last week", query: "after:7d" },
  { label: "PDFs only", query: "type:pdf" },
  { label: "Shared with me", query: "shared:me" },
];

const QUICK_FILTERS = [
  { label: "All", value: "all", icon: Icons.Search },
  { label: "Documents", value: "document", icon: Icons.FileIcon },
  { label: "Messages", value: "message", icon: Icons.Messages },
  { label: "People", value: "person", icon: Icons.Agents },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search/${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-f37-stout text-2xl tracking-tight">
            Search everything
          </h1>
          <p className="text-muted-foreground">
            Find documents, messages, and more across all your connected apps
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch}>
          <div className="relative mb-6">
            <div className="flex h-14 items-center border border-border bg-background transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <Icons.Search className="ml-4 text-muted-foreground" size={20} />
              <Input
                autoFocus
                className="flex-1 border-0 bg-transparent px-3 text-base placeholder:text-muted-foreground focus-visible:ring-0"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                value={query}
              />
              <Button
                className="mr-2 h-10 px-6"
                disabled={!query.trim()}
                type="submit"
              >
                Search
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Filters */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {QUICK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                  activeFilter === filter.value
                    ? "border border-primary bg-primary/5 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                <Icon size={16} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search Suggestions */}
        <div className="space-y-3">
          <p className="text-center text-muted-foreground text-sm">
            Try searching for:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                className="border border-border border-dashed px-3 py-1.5 font-mono text-muted-foreground text-xs transition-colors hover:border-primary hover:text-primary"
                key={suggestion.query}
                onClick={() => handleSuggestionClick(suggestion.query)}
                type="button"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Searches Link */}
        <div className="mt-12 text-center">
          <Button
            className="text-muted-foreground"
            onClick={() => router.push("/search/saved")}
            variant="ghost"
          >
            <Icons.History className="mr-2" size={16} />
            View saved searches
          </Button>
        </div>
      </div>
    </div>
  );
}
