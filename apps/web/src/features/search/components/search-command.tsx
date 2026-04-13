"use client";

import { Input } from "@openbeam/ui";
import { Command as CommandPrimitive } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useSearchAutocomplete } from "../hooks/use-search";
import type { AutocompleteSuggestion } from "../types";
import { SearchCommandDropdown } from "./search-command-dropdown";

type Props = {
  onSubmit: (query: string) => void;
  onSelectSuggestion?: (suggestion: AutocompleteSuggestion) => void;
};

export function SearchCommand({ onSubmit, onSelectSuggestion }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const { data, isFetching } = useSearchAutocomplete(localQuery, {
    enabled: isFocused,
  });

  const suggestions = useMemo<AutocompleteSuggestion[]>(() => {
    if (!data) {
      return [];
    }
    return [...(data.entities ?? []), ...(data.documents ?? [])];
  }, [data]);

  const showDropdown = isFocused && localQuery.length >= 1;

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      inputRef.current?.focus();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "escape",
    () => (localQuery ? setLocalQuery("") : inputRef.current?.blur()),
    { enableOnFormTags: true, enabled: isFocused }
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (localQuery.trim().length >= 2) {
      onSubmit(localQuery.trim());
    }
  };

  const handleClear = () => {
    setLocalQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="relative w-full max-w-xl">
        <CommandPrimitive
          className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
          loop
          shouldFilter={false}
        >
          <div
            className={cn(
              "border border-border/50 bg-background",
              showDropdown && "border-b-0"
            )}
          >
            <div className="flex h-12 items-center gap-3 px-4">
              <Icons.Search className="shrink-0 text-foreground/40" size={18} />
              <CommandPrimitive.Input
                asChild
                onValueChange={setLocalQuery}
                value={localQuery}
              >
                <Input
                  className="h-full flex-1 border-0 bg-transparent px-0 text-[15px] placeholder:text-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && suggestions.length === 0) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Search everything..."
                  ref={inputRef}
                  spellCheck={false}
                  type="text"
                />
              </CommandPrimitive.Input>
              {isFetching && localQuery.length >= 1 && (
                <Icons.Spinner
                  className="shrink-0 animate-spin text-foreground/30"
                  size={14}
                />
              )}
              {localQuery ? (
                <button
                  className="shrink-0 text-foreground/40 transition-colors hover:text-foreground/70"
                  onClick={handleClear}
                  type="button"
                >
                  <Icons.Close size={16} />
                </button>
              ) : (
                <kbd className="hidden shrink-0 items-center gap-1 font-mono text-[10px] text-foreground/30 sm:flex">
                  <span className="border border-border/50 bg-foreground/3 px-1.5 py-0.5">
                    ⌘K
                  </span>
                </kbd>
              )}
            </div>
          </div>

          {showDropdown && (
            <SearchCommandDropdown
              documents={data?.documents ?? []}
              entities={data?.entities ?? []}
              isFetching={isFetching}
              onExpandAll={handleSubmit}
              onSelect={(s) => {
                if (s.type === "entity") {
                  onSubmit(s.label);
                } else {
                  onSelectSuggestion?.(s);
                }
              }}
            />
          )}
        </CommandPrimitive>
      </div>
    </div>
  );
}
