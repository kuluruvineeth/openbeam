"use client";

import { Button, Input } from "@openbeam/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";

type Props = {
  onAdvance: () => void;
  onSkip: () => void;
};

const SUGGESTIONS = [
  "What are our current priorities?",
  "How does deployment work?",
  "Who is working on the API?",
];

export function FirstSearchStep({ onAdvance }: Props) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (query.trim().length >= 2) {
      setSearched(true);
    }
  };

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h2 className="font-medium text-lg">
          {searched ? "You're all set!" : "Try your first search"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {searched
            ? "OpenBeam is ready. Search across all your connected data from the home page."
            : "Type a question or keyword to search across your connected data."}
        </p>
      </div>

      {!searched && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icons.Search
                className="-translate-y-1/2 absolute top-1/2 left-3 text-foreground/40"
                size={14}
              />
              <Input
                className="h-9 border-border/50 pl-9 text-sm"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search everything..."
                value={query}
              />
            </div>
            <Button
              disabled={query.trim().length < 2}
              onClick={handleSearch}
              size="sm"
            >
              Search
            </Button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-foreground/40 uppercase">
              Try asking
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                className="block w-full text-left text-foreground/60 text-xs transition-colors hover:text-foreground"
                key={s}
                onClick={() => {
                  setQuery(s);
                  setSearched(true);
                }}
                type="button"
              >
                "{s}"
              </button>
            ))}
          </div>
        </>
      )}

      {searched && (
        <div className="flex items-center gap-3 border border-border/50 bg-foreground/3 px-4 py-3">
          <Icons.Check className="shrink-0 text-foreground/60" size={16} />
          <div className="flex-1">
            <p className="text-sm">Search is working</p>
            <p className="text-foreground/50 text-xs">
              Use the search bar anytime to find anything across your tools.
            </p>
          </div>
        </div>
      )}

      <Button onClick={onAdvance} size="sm">
        {searched ? "Go to dashboard" : "Skip"}
      </Button>
    </div>
  );
}
